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
  };
});

describe('PAIPlugin Circuit Breaker', () => {
  let originalStderrWrite: any;
  let stderrWriteMock: any;

  beforeEach(() => {
    // Setup temp dir
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    originalStderrWrite = process.stderr.write;
    stderrWriteMock = mock(() => {});
    process.stderr.write = stderrWriteMock;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mock.restore();
  });

  it('should stop updating title after an error', async () => {
    const plugin = await PAIPlugin({
      project: { worktree: '/tmp' },
      directory: '/tmp',
      $: {},
      client: {}
    } as any);

    const eventHook = plugin.event;
    if (!eventHook) throw new Error('Event hook not found');

    // 1. First call - succeeds
    await eventHook({
      event: {
        type: 'message.part.updated',
        properties: {
          part: { type: 'text', text: 'hello world' }
        }
      } as any
    });

    expect(stderrWriteMock).toHaveBeenCalledTimes(1);

    // 2. Second call - make it fail
    stderrWriteMock.mockImplementationOnce(() => {
      throw new Error('EPIPE');
    });

    await eventHook({
      event: {
        type: 'message.part.updated',
        properties: {
          part: { type: 'text', text: 'generating code' }
        }
      } as any
    });

    // Should have been called (and failed)
    expect(stderrWriteMock).toHaveBeenCalledTimes(2);

    // 3. Third call - should be skipped due to circuit breaker
    stderrWriteMock.mockClear();
    
    await eventHook({
      event: {
        type: 'message.part.updated',
        properties: {
          part: { type: 'text', text: 'still generating' }
        }
      } as any
    });

    // Should NOT have been called
    expect(stderrWriteMock).toHaveBeenCalledTimes(0);
  });
});
