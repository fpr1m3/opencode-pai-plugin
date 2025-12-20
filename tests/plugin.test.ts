import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { PAIPlugin } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Use a temp dir to avoid polluting real history
const TEMP_DIR = '/tmp/pai-test-plugin-' + Date.now();

// Mock paths to redirect logs
const pathsModulePath = path.resolve(__dirname, '../src/lib/paths.ts');
mock.module(pathsModulePath, () => {
  return {
    PAI_DIR: TEMP_DIR,
    getHistoryFilePath: (subdir: string, filename: string) => path.join(TEMP_DIR, 'history', subdir, filename),
    join: path.join,
    dirname: path.dirname,
    HISTORY_DIR: path.join(TEMP_DIR, 'history'),
  };
});

describe('PAIPlugin Integration', () => {
  let originalStderrWrite: any;
  let stderrWriteMock: any;

  beforeEach(() => {
    // Setup temp dir
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(path.join(TEMP_DIR, 'history'), { recursive: true });

    originalStderrWrite = process.stderr.write;
    stderrWriteMock = mock(() => true);
    process.stderr.write = stderrWriteMock;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mock.restore();
  });

  it('should initialize and load project requirements', async () => {
    const projectDir = path.join(TEMP_DIR, 'project');
    const opencodeDir = path.join(projectDir, '.opencode');
    fs.mkdirSync(opencodeDir, { recursive: true });
    fs.writeFileSync(path.join(opencodeDir, 'dynamic-requirements.md'), 'Test Requirements');

    const plugin = await PAIPlugin({
      worktree: projectDir,
    } as any);

    expect(plugin).toBeDefined();
    expect(plugin.event).toBeDefined();
  });

  it('should update tab title on tool.call event', async () => {
    const plugin = await PAIPlugin({
      worktree: TEMP_DIR,
    } as any);

    const eventHook = plugin.event;
    if (!eventHook) throw new Error('Event hook not found');

    await eventHook({
      event: {
        type: 'tool.call',
        properties: {
          tool: 'Bash',
          input: { command: 'ls -la' }
        }
      } as any
    });

    expect(stderrWriteMock).toHaveBeenCalled();
    const lastCall = stderrWriteMock.mock.calls[0][0];
    expect(lastCall).toContain('Running ls...');
  });

  it('should deny dangerous commands via permission.ask', async () => {
    const plugin = await PAIPlugin({
      worktree: TEMP_DIR,
    } as any);

    const permissionHook = (plugin as any)["permission.ask"];
    expect(permissionHook).toBeDefined();

    const result = await permissionHook({
      tool: 'Bash',
      arguments: { command: 'rm -rf /' }
    });

    expect(result.status).toBe('deny');
    expect(result.feedback).toContain('SECURITY');
  });

  it('should ask for confirmation on risky git commands', async () => {
    const plugin = await PAIPlugin({
      worktree: TEMP_DIR,
    } as any);

    const permissionHook = (plugin as any)["permission.ask"];
    const result = await permissionHook({
      tool: 'Bash',
      arguments: { command: 'git push --force' }
    });

    expect(result.status).toBe('ask');
  });
});
