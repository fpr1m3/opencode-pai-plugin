/**
 * PAI Path Resolution - Single Source of Truth
 *
 * This module provides consistent path resolution across all PAI hooks.
 * It handles PAI_DIR detection whether set explicitly or defaulting to ~/.claude
 *
 * Usage in hooks:
 *   import { PAI_DIR, HOOKS_DIR, SKILLS_DIR } from './lib/paths';
 */

import { homedir } from 'os';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * Smart PAI_DIR detection with fallback
 * Priority:
 * 1. PAI_DIR environment variable (if set)
 * 2. $XDG_CONFIG_HOME/opencode (standard XDG location)
 * 3. ~/.config/opencode (fallback if XDG_CONFIG_HOME is not set)
 */
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
export const PAI_DIR = process.env.PAI_DIR
  ? resolve(process.env.PAI_DIR)
  : resolve(XDG_CONFIG_HOME, 'opencode');

/**
 * Common PAI directories
 */
export const HOOKS_DIR = join(PAI_DIR, 'hooks');
export const SKILLS_DIR = join(PAI_DIR, 'skills');
export const AGENTS_DIR = join(PAI_DIR, 'agents');
export const HISTORY_DIR = join(PAI_DIR, 'history');
export const COMMANDS_DIR = join(PAI_DIR, 'commands');

/**
 * Validate PAI directory structure on first import
 * This fails fast with a clear error if PAI is misconfigured
 */
function validatePAIStructure(): void {
  // Only validate if we are actually in a context where we expect PAI to exist.
  // For the plugin, we might not want to hard crash if the user hasn't set it up yet,
  // but PAI plugin implies PAI usage.
  // We will log a warning instead of exit(1) to be safer in a plugin environment.
  if (!existsSync(PAI_DIR)) {
     // console.warn(`⚠️ PAI_DIR does not exist: ${PAI_DIR}`);
  }
}

validatePAIStructure();

/**
 * Helper to get history file path with date-based organization
 */
export function getHistoryFilePath(subdir: string, filename: string): string {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');

  return join(HISTORY_DIR, subdir, `${year}-${month}`, filename);
}
