import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const TEMP_DIR = '/tmp/pai-test-' + Date.now();

// Calculate absolute path to the module we want to mock
const pathsModulePath = path.resolve(__dirname, '../src/lib/paths.ts');

mock.module(pathsModulePath, () => {
  return {
    PAI_DIR: TEMP_DIR,
    getHistoryFilePath: (subdir: string, filename: string) => path.join(TEMP_DIR, 'history', subdir, filename),
    join: path.join,
    dirname: path.dirname,
    // Add other exports if needed
    HOOKS_DIR: path.join(TEMP_DIR, 'hooks'),
    SKILLS_DIR: path.join(TEMP_DIR, 'skill'),
    AGENTS_DIR: path.join(TEMP_DIR, 'agents'),
    HISTORY_DIR: path.join(TEMP_DIR, 'history'),
    COMMANDS_DIR: path.join(TEMP_DIR, 'commands'),
  };
});

describe('Logger Integration', () => {
  let Logger: any;
  let logger: any;

  beforeEach(async () => {
    // Clean up temp dir
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Dynamic import to get the Logger class
    // We append a query string to force reload if possible? Bun doesn't support that for FS modules easily.
    // But since we are mocking the dependency, if Logger is re-evaluated or if it uses the mocked module, it should work.
    // Ideally we'd use a fresh Logger class.
    
    // We might need to use the absolute path for logger too to ensure we are importing the same thing
    const loggerPath = path.resolve(__dirname, '../src/lib/logger.ts');
    const module = await import(loggerPath);
    Logger = module.Logger;
    
    logger = new Logger('test-session');
  });

  afterEach(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mock.restore();
  });

  it('should log events to a file', async () => {
    const event = {
      type: 'test.event',
      properties: { foo: 'bar' }
    };

    logger.logOpenCodeEvent(event);

    const rawOutputsDir = path.join(TEMP_DIR, 'history', 'raw-outputs');
    expect(fs.existsSync(rawOutputsDir)).toBe(true);
    
    const files = fs.readdirSync(rawOutputsDir);
    expect(files.length).toBe(1);
    expect(files[0].endsWith('.jsonl')).toBe(true);
    
    const content = fs.readFileSync(path.join(rawOutputsDir, files[0]), 'utf-8');
    expect(content).toContain('test.event');
    expect(content).toContain('"foo":"bar"');
  });

  it('should handle errors by logging to error file', async () => {
    // 1. Setup
    logger.logOpenCodeEvent({ type: 'init' });
    const rawOutputsDir = path.join(TEMP_DIR, 'history', 'raw-outputs');
    const files = fs.readdirSync(rawOutputsDir);
    const eventsFile = path.join(rawOutputsDir, files[0]);
    
    // Delete file and replace with directory to force EISDIR
    fs.unlinkSync(eventsFile);
    fs.mkdirSync(eventsFile); 
    
    // 2. Trigger event logging
    const event = {
      type: 'test.event.fail',
      properties: { foo: 'baz' }
    };

    expect(() => logger.logOpenCodeEvent(event)).not.toThrow();

    // 3. Verify error log
    const systemLogsDir = path.join(TEMP_DIR, 'history', 'system-logs');
    expect(fs.existsSync(systemLogsDir)).toBe(true);
    
    const logFiles = fs.readdirSync(systemLogsDir);
    expect(logFiles.length).toBeGreaterThan(0);
    expect(logFiles[0].endsWith('_errors.log')).toBe(true);
    
    const errorContent = fs.readFileSync(path.join(systemLogsDir, logFiles[0]), 'utf-8');
    expect(errorContent).toContain('EventCapture');
    expect(errorContent).toContain('EISDIR');
  });
});
