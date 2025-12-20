/**
 * PAI Path Resolution - Single Source of Truth
 *
 * This module provides consistent path resolution across all PAI hooks.
 * It handles PAI_DIR detection whether set explicitly or defaulting to ~/.claude
 *
 * Usage in hooks:
 *   import { PAI_DIR, HOOKS_DIR, SKILLS_DIR } from './lib/paths';
 */
export declare const PAI_DIR: string;
/**
 * Common PAI directories
 */
export declare const HOOKS_DIR: string;
export declare const SKILLS_DIR: string;
export declare const AGENTS_DIR: string;
export declare const HISTORY_DIR: string;
export declare const COMMANDS_DIR: string;
/**
 * Helper to get history file path with date-based organization
 */
export declare function getHistoryFilePath(subdir: string, filename: string): string;
