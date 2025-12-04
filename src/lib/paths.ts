import { join } from 'path';

export function getHistoryDir(baseDir: string): string {
  return join(baseDir, '.opencode', 'history');
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