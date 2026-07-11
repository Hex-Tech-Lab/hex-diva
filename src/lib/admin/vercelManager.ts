/**
 * Vercel Manager for Admin Settings Deployment
 * Triggers Vercel redeployment via API after git changes
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
 * Check if Vercel is configured
 */
export function isVercelConfigured(): boolean {
  return !!(VERCEL_TOKEN && VERCEL_PROJECT_ID);
}

/**
 * Trigger a deployment on Vercel
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
 * Poll deployment status
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
 * Wait for deployment to complete (with timeout)
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
 * Trigger and monitor deployment
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
