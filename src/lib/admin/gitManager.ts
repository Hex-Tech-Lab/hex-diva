/**
 * Git Manager for Admin Settings Persistence
 *
 * Handles git operations for settings deployment:
 * - Writing settings file to disk
 * - Staging and committing changes
 * - Pushing to remote repository
 *
 * WARNING: This module runs git from app code at runtime, which is high-risk:
 * - Environment-sensitive (requires git CLI, SSH config, etc.)
 * - Failed pushes can stall deployment workflows
 * - Should ideally use GitHub API instead of shell exec
 *
 * @module lib/admin/gitManager
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

/**
 * Get the absolute path to settings file
 * @returns Path to src/config/settings.ts
 */
function getSettingsFilePath(): string {
  return path.join(process.cwd(), 'src/config/settings.ts');
}

/**
 * Checks if git CLI is available and repository is configured with remote
 * @returns True if git is available and remote is configured, false otherwise
 */
export function isGitAvailable(): boolean {
  try {
    execSync('git --version', { stdio: 'pipe' });
    execSync('git remote -v', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the current settings file from disk
 * @returns Settings file content as string
 * @throws Error if file cannot be read
 */
export async function readSettingsFile(): Promise<string> {
  try {
    return await fs.readFile(getSettingsFilePath(), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read settings file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Writes settings file to disk
 * @param content - The complete settings file content as string
 * @throws Error if file cannot be written
 */
export async function writeSettingsFile(content: string): Promise<void> {
  try {
    await fs.writeFile(getSettingsFilePath(), content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write settings file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Stages settings.ts file for git commit
 * @returns CommitResult with success flag and error message if failed
 */
export function stageSettingsFile(): CommitResult {
  try {
    execSync('git add src/config/settings.ts', { stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to stage settings file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Creates a git commit with admin metadata in commit message
 * @param section - Settings section (payment, affiliate, etc.)
 * @param field - Field name being changed
 * @param adminEmail - Admin user email for audit trail
 * @param description - Optional description of the change
 * @returns CommitResult with commit hash if successful
 */
export function commitSettings(
  section: string,
  field: string,
  adminEmail: string,
  description?: string
): CommitResult {
  try {
    const message = `Admin: update ${section}.${field}

Section: ${section}
Field: ${field}
Admin: ${adminEmail}
Timestamp: ${new Date().toISOString()}
${description ? `Details: ${description}` : ''}`;

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });

    const commitHash = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();

    return {
      success: true,
      commitHash,
      message: `Settings updated: ${section}.${field}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to commit: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Pushes committed changes to remote repository
 * Implements retry logic with exponential backoff: 2s, 4s, 8s, 16s (max 4 attempts)
 * @returns CommitResult with success flag and error message if all retries fail
 */
export async function pushChanges(): Promise<CommitResult> {
  const maxRetries = 4;
  const delays = [2000, 4000, 8000, 16000]; // milliseconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      execSync('git push -u origin HEAD', { stdio: 'pipe' });
      return {
        success: true,
        message: 'Changes pushed to remote',
      };
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        return {
          success: false,
          error: `Failed to push after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Wait before retrying
      const delay = delays[attempt];
      console.log(`[GitManager] Push attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: 'Failed to push: max retries exceeded',
  };
}

/**
 * Get current git status
 */
export function getGitStatus(): { clean: boolean; uncommitted: string[] } {
  try {
    const status = execSync('git status --short', { stdio: 'pipe' }).toString();
    const uncommitted = status
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.slice(3));

    return {
      clean: uncommitted.length === 0,
      uncommitted,
    };
  } catch {
    return { clean: false, uncommitted: [] };
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get latest commit hash
 */
export function getLatestCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

/**
 * Full workflow: write, stage, commit, and push
 */
export async function persistSettingsChange(
  content: string,
  section: string,
  field: string,
  adminEmail: string,
  description?: string
): Promise<CommitResult & { deploymentRequired?: boolean }> {
  try {
    // 1. Write to file
    await writeSettingsFile(content);

    // 2. Stage
    const stageResult = stageSettingsFile();
    if (!stageResult.success) {
      return { success: false, error: stageResult.error };
    }

    // 3. Commit
    const commitResult = commitSettings(section, field, adminEmail, description);
    if (!commitResult.success) {
      return commitResult;
    }

    // 4. Push
    const pushResult = await pushChanges();
    if (!pushResult.success) {
      return pushResult;
    }

    return {
      success: true,
      commitHash: commitResult.commitHash,
      message: `Settings persisted: ${section}.${field}`,
      deploymentRequired: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Persistence workflow failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
