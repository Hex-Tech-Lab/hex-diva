/**
 * Vercel Manager for Admin Settings Deployment
 *
 * Triggers Vercel redeployment via API after git changes are pushed.
 * Used by admin settings persistence workflow to automatically deploy config changes.
 *
 * WARNING: Deployment polling is async and can leave hanging state if connection breaks.
 * Consider moving to a background job or durable state machine for production.
 *
 * @module lib/admin/vercelManager
 */

export interface VercelDeploymentResult {
  success: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  status?: 'created' | 'building' | 'ready' | 'failed';
  message?: string;
  error?: string;
}

const VERCEL_API_BASE = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

/**
 * Checks if Vercel is configured with required API credentials
 * @returns {boolean} True if VERCEL_TOKEN and VERCEL_PROJECT_ID are set, false otherwise
 * @remarks This function performs a simple environment variable check; it does not validate credentials
 */
export function isVercelConfigured(): boolean {
  return !!(VERCEL_TOKEN && VERCEL_PROJECT_ID);
}

/**
 * Triggers a production deployment on Vercel
 * Initiates a build for the current git commit SHA via Vercel API
 * @returns {Promise<VercelDeploymentResult>} Result object with deployment ID, URL, status, and error message if failed
 * @remarks Requires VERCEL_TOKEN and VERCEL_PROJECT_ID to be configured; returns error response if not configured
 * @example
 * const result = await triggerDeployment();
 * if (result.success) {
 *   console.log(`Deployment ${result.deploymentId} at ${result.deploymentUrl}`);
 * }
 */
export async function triggerDeployment(): Promise<VercelDeploymentResult> {
  if (!isVercelConfigured()) {
    return {
      success: false,
      error: 'Vercel not configured: missing VERCEL_TOKEN or VERCEL_PROJECT_ID',
    };
  }

  try {
    const url = VERCEL_TEAM_ID
      ? `${VERCEL_API_BASE}/v13/deployments?teamId=${VERCEL_TEAM_ID}`
      : `${VERCEL_API_BASE}/v13/deployments`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: VERCEL_PROJECT_ID,
        source: 'cli',
        gitSource: {
          type: 'github',
          ref: process.env.GIT_COMMIT_SHA || 'HEAD',
        },
        target: 'production',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[VercelManager] Deployment failed:', error);
      return {
        success: false,
        error: `Vercel API error: ${error.message || response.statusText}`,
      };
    }

    const deployment = await response.json();

    return {
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: deployment.url,
      status: deployment.status || 'created',
      message: `Deployment triggered: ${deployment.url || 'pending'}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to trigger deployment: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Poll deployment status from Vercel API
 * Retrieves current state of a deployment by ID
 * @param {string} deploymentId - Unique Vercel deployment identifier
 * @returns {Promise<VercelDeploymentResult>} Current deployment status (created, building, ready, failed) and metadata
 * @throws Does not throw; returns error in result object
 */
export async function getDeploymentStatus(deploymentId: string): Promise<VercelDeploymentResult> {
  if (!isVercelConfigured()) {
    return {
      success: false,
      error: 'Vercel not configured',
    };
  }

  try {
    const url = VERCEL_TEAM_ID
      ? `${VERCEL_API_BASE}/v13/deployments/${deploymentId}?teamId=${VERCEL_TEAM_ID}`
      : `${VERCEL_API_BASE}/v13/deployments/${deploymentId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch deployment status: ${response.statusText}`,
      };
    }

    const deployment = await response.json();

    return {
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: deployment.url,
      status: deployment.status as 'created' | 'building' | 'ready' | 'failed',
      message: `Deployment ${deployment.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to check deployment status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Polls deployment status until complete or timeout
 * Continuously checks deployment state with 5-second intervals until ready, failed, or timeout reached
 * @param {string} deploymentId - Unique Vercel deployment identifier
 * @param {number} [maxWaitSeconds=300] - Maximum wait time in seconds (default 5 minutes)
 * @returns {Promise<VercelDeploymentResult>} Final deployment result (ready/failed/timeout)
 * @remarks Polls every 5 seconds; useful for admin workflows requiring synchronous wait
 */
export async function waitForDeployment(
  deploymentId: string,
  maxWaitSeconds: number = 300
): Promise<VercelDeploymentResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  const pollIntervalMs = 5000; // Check every 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getDeploymentStatus(deploymentId);

    if (!status.success) {
      return status;
    }

    if (status.status === 'ready') {
      return {
        success: true,
        deploymentId,
        deploymentUrl: status.deploymentUrl,
        status: 'ready',
        message: `Deployment ready: ${status.deploymentUrl}`,
      };
    }

    if (status.status === 'failed') {
      return {
        success: false,
        deploymentId,
        status: 'failed',
        error: 'Deployment failed',
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    success: false,
    deploymentId,
    error: `Deployment timeout: exceeded ${maxWaitSeconds} seconds`,
  };
}

/**
 * Triggers deployment and optionally waits for completion
 * Convenience wrapper combining triggerDeployment and waitForDeployment
 * @param {string} [_commitMessage='Admin settings update'] - Descriptive message for deployment (used for audit trail)
 * @param {boolean} [waitForCompletion=false] - If true, polls status until complete or timeout
 * @param {number} [maxWaitSeconds=300] - Maximum wait time if waitForCompletion is true
 * @returns {Promise<VercelDeploymentResult>} Deployment result (immediate trigger result or final status if waiting)
 * @remarks When waitForCompletion=false, returns immediately after triggering; deployment continues in background
 */
export async function deployAndMonitor(
  _commitMessage: string = 'Admin settings update',
  waitForCompletion: boolean = false,
  maxWaitSeconds: number = 300
): Promise<VercelDeploymentResult> {
  // Trigger deployment
  const triggerResult = await triggerDeployment();

  if (!triggerResult.success || !triggerResult.deploymentId) {
    return triggerResult;
  }

  // If not waiting for completion, return immediately
  if (!waitForCompletion) {
    return triggerResult;
  }

  // Wait for deployment to complete
  return waitForDeployment(triggerResult.deploymentId, maxWaitSeconds);
}
