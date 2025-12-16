import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Event } from '@opencode-ai/sdk';
import { PAI_DIR, getHistoryFilePath } from './paths';
import { enrichEventWithAgentMetadata, isAgentSpawningCall } from './metadata-extraction';

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_pst: string;
  [key: string]: any;
}

export class Logger {
  private sessionId: string;
  private projectRoot: string;

  constructor(sessionId: string, projectRoot: string) {
    this.sessionId = sessionId;
    this.projectRoot = projectRoot;
  }

  // Get PST timestamp
  private getPSTTimestamp(): string {
    const date = new Date();
    const pstDate = new Date(date.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));

    const year = pstDate.getFullYear();
    const month = String(pstDate.getMonth() + 1).padStart(2, '0');
    const day = String(pstDate.getDate()).padStart(2, '0');
    const hours = String(pstDate.getHours()).padStart(2, '0');
    const minutes = String(pstDate.getMinutes()).padStart(2, '0');
    const seconds = String(pstDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST`;
  }

  private getEventsFilePath(): string {
    const now = new Date();
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));
    const year = pstDate.getFullYear();
    const month = String(pstDate.getMonth() + 1).padStart(2, '0');
    const day = String(pstDate.getDate()).padStart(2, '0');

    const filename = `${year}-${month}-${day}_all-events.jsonl`;
    const filePath = getHistoryFilePath('raw-outputs', filename);
    const dir = dirname(filePath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return filePath;
  }

  private getSessionMappingFile(): string {
    return join(PAI_DIR, 'agent-sessions.json');
  }

  private getAgentForSession(sessionId: string): string {
    try {
      const mappingFile = this.getSessionMappingFile();
      if (existsSync(mappingFile)) {
        const mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
        return mappings[sessionId] || 'pai';
      }
    } catch (error) {
      // Ignore errors, default to pai
    }
    return 'pai';
  }

  private setAgentForSession(sessionId: string, agentName: string): void {
    try {
      const mappingFile = this.getSessionMappingFile();
      let mappings: Record<string, string> = {};

      if (existsSync(mappingFile)) {
        mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      }

      mappings[sessionId] = agentName;
      writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
    } catch (error) {
      // Silently fail - don't block
    }
  }

  public logEvent(event: Event): void {
    // Legacy method, not used much as we use logOpenCodeEvent
    // But might be called from index.ts if I didn't update all calls
    this.logOpenCodeEvent(event);
  }

  // Method to log generic OpenCode event
  public logOpenCodeEvent(event: Event): void {
      // We can't access event.timestamp directly if it doesn't exist on the type
      // OpenCode Event types might not all have timestamp.
      // Checking type definitions or assuming Date.now() if missing.
      const timestamp = (event as any).timestamp || Date.now();

      const payload = {
          ...event.properties,
          timestamp: timestamp
      };

      this.writeEvent(event.type, payload);
  }

  // Method to log tool execution (called from tool.execute.after hook)
  public logToolExecution(input: any, output: any): void {
      const toolName = input.tool;
      const toolInput = input.args;

      const sessionId = this.sessionId;

      // Logic to update agent mapping
      if (toolName === 'Task' && toolInput?.subagent_type) {
          this.setAgentForSession(sessionId, toolInput.subagent_type);
      } else if (input.tool === 'subagent_stop' || input.tool === 'stop') { // Hypothethical
           this.setAgentForSession(sessionId, 'pai');
      }

      // We might want to log this as an event too
      const payload = {
          tool_name: toolName,
          tool_input: toolInput,
          tool_output: output,
          // ... other fields
      };

      this.writeEvent('ToolUse', payload, toolName, toolInput);
  }

  public logError(context: string, error: any): void {
    try {
      const now = new Date();
      const pstDate = new Date(now.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));
      const year = pstDate.getFullYear();
      const month = String(pstDate.getMonth() + 1).padStart(2, '0');
      const day = String(pstDate.getDate()).padStart(2, '0');

      const filename = `${year}-${month}-${day}_errors.log`;
      const filePath = getHistoryFilePath('system-logs', filename);
      const dir = dirname(filePath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const timestamp = this.getPSTTimestamp();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      
      const logEntry = `[${timestamp}] [${context}] ${errorMessage}\n${stack}\n-------------------\n`;
      appendFileSync(filePath, logEntry, 'utf-8');
    } catch (e) {
      // Intentionally silent - TUI protection
    }
  }

  // Core write method
  private writeEvent(eventType: string, payload: any, toolName?: string, toolInput?: any): void {
      const sessionId = this.sessionId;
      let agentName = this.getAgentForSession(sessionId);

      // Create base event object
      let hookEvent: HookEvent = {
        source_app: agentName,
        session_id: sessionId,
        hook_event_type: eventType,
        payload: payload,
        timestamp: Date.now(),
        timestamp_pst: this.getPSTTimestamp()
      };

      // Enrich with agent instance metadata if this is a Task tool call
      if (toolName && toolInput && isAgentSpawningCall(toolName, toolInput)) {
        hookEvent = enrichEventWithAgentMetadata(
          hookEvent,
          toolInput,
          payload.description // Assuming description is available in payload if passed
        );
      }

      try {
        const eventsFile = this.getEventsFilePath();
        const jsonLine = JSON.stringify(hookEvent) + '\n';
        appendFileSync(eventsFile, jsonLine, 'utf-8');
      } catch (error) {
        this.logError('EventCapture', error);
      }
  }

  public flush(): void {
    // No-op for now as we append synchronously
  }
}
