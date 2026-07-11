/**
 * Settings File Mutation Utility
 * Safely updates TypeScript settings.ts file with validation and backup
 * Used by admin settings persistence workflow
 */

import fs from 'fs/promises';
import path from 'path';

export interface MutationRequest {
  section: string;
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

export interface MutationResult {
  success: boolean;
  error?: string;
  backupPath?: string;
  message?: string;
  linesChanged?: number;
}

/**
 * Get absolute path to settings file
 */
function getSettingsFilePath(): string {
  return path.join(process.cwd(), 'src/config/settings.ts');
}

/**
 * Create backup of settings file
 */
async function createBackup(content: string): Promise<string> {
  const backupDir = path.join(process.cwd(), '.backups');
  try {
    await fs.mkdir(backupDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `settings.ts.backup.${timestamp}`);
  await fs.writeFile(backupPath, content, 'utf-8');
  return backupPath;
}

/**
 * Serialize value to TypeScript literal
 */
function serializeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    // Escape single quotes and wrap in quotes
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    // For objects, use JSON.stringify but preserve as JS object
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Validate mutation request
 */
function validateMutation(request: MutationRequest): { valid: boolean; error?: string } {
  if (!request.section || !request.field) {
    return { valid: false, error: 'section and field are required' };
  }

  if (request.newValue === undefined) {
    return { valid: false, error: 'newValue cannot be undefined' };
  }

  // Prevent dangerous patterns
  const dangerousPatterns = [
    /import\s+/i,
    /export\s+/i,
    /\/\//,
    /\/\*/,
    /process\.env/i,
    /require\s*\(/i,
    /eval\s*\(/i,
  ];

  const valueStr = String(request.newValue);
  for (const pattern of dangerousPatterns) {
    if (pattern.test(valueStr)) {
      return {
        valid: false,
        error: `newValue contains dangerous pattern: ${pattern.source}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Find and update a settings value in the TypeScript file
 * Uses regex-based replacement with validation
 */
export async function mutateSettings(
  request: MutationRequest
): Promise<MutationResult> {
  // Validate request
  const validation = validateMutation(request);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const filePath = getSettingsFilePath();
    const content = await fs.readFile(filePath, 'utf-8');

    // Create backup before modifying
    const backupPath = await createBackup(content);

    // Build regex pattern to find the field
    // Looks for: fieldName: someValue (handles nested objects)
    const fieldPattern = new RegExp(
      `(${request.field}\\s*:\\s*)([^,}\\n]+)(?=[,}\\n])`,
      'g'
    );

    if (!fieldPattern.test(content)) {
      return {
        success: false,
        error: `Field '${request.field}' not found in settings file`,
        backupPath,
      };
    }

    // Reset regex
    fieldPattern.lastIndex = 0;

    // Serialize new value
    const newValueStr = serializeValue(request.newValue);

    // Replace all occurrences
    let linesChanged = 0;
    fieldPattern.lastIndex = 0;

    const updatedContent = content.replace(fieldPattern, (_match, prefix) => {
      linesChanged++;
      return `${prefix}${newValueStr}`;
    });

    if (linesChanged === 0) {
      return {
        success: false,
        error: `Could not match field '${request.field}' for replacement`,
        backupPath,
      };
    }

    // Validate the updated content is still valid TypeScript (basic check)
    if (!updatedContent.includes('export const')) {
      return {
        success: false,
        error: 'Updated file appears malformed (missing exports)',
        backupPath,
      };
    }

    // Write updated content
    await fs.writeFile(filePath, updatedContent, 'utf-8');

    return {
      success: true,
      backupPath,
      message: `Updated ${linesChanged} occurrence(s) of '${request.field}'`,
      linesChanged,
    };
  } catch (error) {
    return {
      success: false,
      error: `Mutation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Read current settings value (for audit trail)
 */
export async function readSettingsValue(_section: string, field: string): Promise<string | null> {
  try {
    const filePath = getSettingsFilePath();
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract value (simplified approach - works for most simple values)
    const pattern = new RegExp(`${field}\\s*:\\s*([^,}\\n]+)`, 'm');
    const valueMatch = content.match(pattern);

    if (!valueMatch || !valueMatch[1]) {
      return null;
    }

    return valueMatch[1].trim();
  } catch {
    return null;
  }
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(backupPath: string): Promise<boolean> {
  try {
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const filePath = getSettingsFilePath();
    await fs.writeFile(filePath, backupContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}
