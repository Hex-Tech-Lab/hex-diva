/**
 * GitHub Manager using Octokit API
 *
 * Replaces shell-based git operations with GitHub REST API:
 * - No dependency on git CLI, SSH config, or environment setup
 * - Works reliably in serverless environments (Vercel)
 * - Proper error handling and retry logic
 * - Atomic operations via GitHub API
 *
 * WARNING: Requires GITHUB_TOKEN environment variable with repo:write permissions
 *
 * @module lib/admin/githubManager
 */

import { Octokit } from '@octokit/rest';

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

/**
 * GitHub API client instance (lazy initialization)
 */
let octokitInstance: Octokit | null = null;

/**
 * Get or initialize Octokit client
 * Requires GITHUB_TOKEN environment variable
 */
function getOctokit(): Octokit {
  if (octokitInstance) {
    return octokitInstance;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN environment variable not set. GitHub API operations require authentication.'
    );
  }

  octokitInstance = new Octokit({ auth: token });
  return octokitInstance;
}

/**
 * Get repository owner and repo name from environment or git config
 * Defaults to: GITHUB_OWNER / GITHUB_REPO environment variables
 */
function getRepoInfo(): { owner: string; repo: string } {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error(
      'GITHUB_OWNER and GITHUB_REPO environment variables must be set'
    );
  }

  return { owner, repo };
}

/**
 * Get current branch name from environment
 * Defaults to GITHUB_REF_NAME or 'main'
 */
function getCurrentBranchName(): string {
  // GitHub Actions provides this
  return process.env.GITHUB_REF_NAME || process.env.HEAD_REF || 'main';
}

/**
 * Check if GitHub API is available and authenticated
 * Returns false if GITHUB_TOKEN is missing or authentication fails
 */
export async function isGitHubAvailable(): Promise<boolean> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return false;
    }

    const octokit = getOctokit();
    const { data } = await octokit.rest.users.getAuthenticated();
    return !!data.login;
  } catch {
    return false;
  }
}

/**
 * Reads the current settings file from GitHub repository
 * @returns Settings file content as string
 * @throws Error if file cannot be read or authentication fails
 */
export async function readSettingsFile(): Promise<string> {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'src/config/settings.ts',
    });

    if (Array.isArray(data)) {
      throw new Error('Unexpected directory response for settings.ts');
    }

    if (data.type !== 'file') {
      throw new Error('settings.ts is not a file');
    }

    // Decode base64 content from GitHub API
    const content = Buffer.from(data.content || '', 'base64').toString('utf-8');
    return content;
  } catch (error) {
    throw new Error(
      `Failed to read settings file via GitHub API: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Creates or updates a file via GitHub API
 * Automatically handles commit message and author metadata
 */
async function createOrUpdateFile(
  path: string,
  content: string,
  message: string,
  currentSha?: string
): Promise<CommitResult> {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha: currentSha,
      committer: {
        name: 'Hex-Diva Admin System',
        email: 'admin@hex-diva.local',
      },
      author: {
        name: 'Hex-Diva Admin System',
        email: 'admin@hex-diva.local',
      },
    });

    if (!data.commit) {
      return {
        success: false,
        error: 'No commit data returned from GitHub API',
      };
    }

    return {
      success: true,
      commitHash: data.commit.sha,
      message: `File committed: ${path}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create/update file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Commits settings change via GitHub API
 * Combines file update and commit in a single atomic operation
 *
 * @param content - The complete settings file content as string
 * @param section - Settings section (payment, affiliate, etc.) — for commit message
 * @param field - Field name being changed — for commit message
 * @param adminEmail - Admin user email for audit trail
 * @param description - Optional description of the change
 * @returns CommitResult with commit hash if successful
 */
export async function commitSettings(
  content: string,
  section: string,
  field: string,
  adminEmail: string,
  description?: string
): Promise<CommitResult> {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    // Get current file SHA for update operation
    let currentSha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'src/config/settings.ts',
      });

      if (!Array.isArray(data) && data.type === 'file') {
        currentSha = data.sha;
      }
    } catch (err) {
      // File might not exist yet, which is fine for create operation
      console.log('[GitHubManager] Settings file does not exist yet, will create');
    }

    // Build detailed commit message with audit trail
    const message = `Admin: update ${section}.${field}

Section: ${section}
Field: ${field}
Admin: ${adminEmail}
Timestamp: ${new Date().toISOString()}
${description ? `Details: ${description}` : ''}`;

    // Commit the file
    const result = await createOrUpdateFile(
      'src/config/settings.ts',
      content,
      message,
      currentSha
    );

    if (result.success) {
      return {
        success: true,
        commitHash: result.commitHash,
        message: `Settings updated: ${section}.${field}`,
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to commit: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Get current repository status (branches, latest commit)
 * Returns basic info without executing git CLI
 */
export async function getRepositoryInfo(): Promise<{
  branch: string;
  latestCommitHash?: string;
  owner: string;
  repo: string;
}> {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();
    const branch = getCurrentBranchName();

    // Get latest commit on current branch
    const { data } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });

    return {
      branch,
      latestCommitHash: data.commit.sha,
      owner,
      repo,
    };
  } catch (error) {
    console.error('[GitHubManager] Error fetching repository info:', error);
    return {
      branch: getCurrentBranchName(),
      owner: process.env.GITHUB_OWNER || 'unknown',
      repo: process.env.GITHUB_REPO || 'unknown',
    };
  }
}

/**
 * Check if GitHub API is available (synchronous wrapper for compatibility)
 * Note: This is a best-effort check; actual API calls may still fail
 */
export function isGitHubConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

/**
 * Full workflow: read, validate, commit, and optionally push
 * This replaces the git shell-based persistSettingsChange
 *
 * The actual push/PR creation can be handled by GitHub Actions after deployment
 * For now, this just commits the file directly to the branch
 */
export async function persistSettingsChange(
  content: string,
  section: string,
  field: string,
  adminEmail: string,
  description?: string
): Promise<CommitResult & { deploymentRequired?: boolean }> {
  try {
    // Verify we have GitHub API available
    if (!isGitHubConfigured()) {
      return {
        success: false,
        error:
          'GitHub API not configured: GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO required',
      };
    }

    // Step 1: Commit the change via GitHub API
    const commitResult = await commitSettings(
      content,
      section,
      field,
      adminEmail,
      description
    );

    if (!commitResult.success) {
      return commitResult;
    }

    return {
      success: true,
      commitHash: commitResult.commitHash,
      message: `Settings persisted: ${section}.${field}`,
      deploymentRequired: true, // Deployment will be triggered separately
    };
  } catch (error) {
    return {
      success: false,
      error: `Persistence workflow failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
