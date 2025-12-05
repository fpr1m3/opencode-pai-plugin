import { join, normalize } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

function resolvePath(path: string): string {
  // Handle ~ expansion
  if (path.startsWith('~')) {
    path = join(homedir(), path.slice(1));
  }

  // Handle environment variable expansion ($VAR or ${VAR})
  path = path.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)|\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, p1, p2) => {
    const varName = p1 || p2;
    return process.env[varName] || '';
  });

  return normalize(path);
}

export function getHistoryDir(baseDir: string): string {
  const envPath = process.env.PAI_HISTORY_PATH;
  const defaultPath = '~/.config/opencode/history';
  const resolvedPath = resolvePath(envPath || defaultPath);

  if (!existsSync(resolvedPath)) {
    try {
        mkdirSync(resolvedPath, { recursive: true });
    } catch (error) {
        // If mkdir fails (e.g. permissions), we log it but return the path anyway
        // The consumer will likely fail later, which is appropriate
        console.error(`Failed to create history directory at ${resolvedPath}:`, error);
    }
  }

  return resolvedPath;
}

export function getRawOutputsDir(baseDir: string): string {
  return join(getHistoryDir(baseDir), 'raw-outputs');
}

export function getSessionsDir(baseDir: string): string {
  return join(getHistoryDir(baseDir), 'sessions');
}

export function getSkillsDir(baseDir: string): string {
  return join(baseDir, '.opencode', 'skills');
}
