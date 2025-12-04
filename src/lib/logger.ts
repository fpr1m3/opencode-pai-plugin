import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getRawOutputsDir } from './paths';
import type { Event } from '@opencode-ai/sdk';

type ToolInput = {
    tool: string;
    sessionID: string;
    callID: string;
};

type ToolOutput = {
    title: string;
    output: string;
    metadata: any;
};

export class Logger {
  private buffer: string[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private logFilePath: string;

  constructor(sessionId: string, baseDir: string) {
    const rawOutputsDir = getRawOutputsDir(baseDir);
    if (!existsSync(rawOutputsDir)) {
      mkdirSync(rawOutputsDir, { recursive: true });
    }
    this.logFilePath = join(rawOutputsDir, `${sessionId}.jsonl`);
  }

  public logEvent(event: Event) {
    this.addToBuffer(JSON.stringify({ type: 'event', event }));
  }

  public logTool(input: ToolInput, output: ToolOutput) {
    this.addToBuffer(JSON.stringify({ type: 'tool', input, output }));
  }

  private addToBuffer(line: string) {
    this.buffer.push(line);
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 1000);
    }
  }

  public flush() {
    if (this.buffer.length > 0) {
      appendFileSync(this.logFilePath, this.buffer.join('\n') + '\n');
      this.buffer = [];
    }
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}
