import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Event } from '@opencode-ai/sdk';
import { PAI_DIR, getHistoryFilePath, HISTORY_DIR } from './paths';
import { enrichEventWithAgentMetadata, isAgentSpawningCall } from './metadata-extraction';
import { redactString, redactObject } from './redaction';

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
  private toolsUsed = new Set<string>();
  private filesChanged = new Set<string>();
  private commandsExecuted: string[] = [];
  private startTime = Date.now();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
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
      const anyEvent = event as any;
      const timestamp = anyEvent.timestamp || Date.now();
      const payload = {
          ...anyEvent.properties,
          timestamp: timestamp
      };

      // Track stats for summary
      if (anyEvent.type === 'tool.call' || anyEvent.type === 'tool.execute.before') {
          const props = anyEvent.properties as any;
          const tool = props?.tool || props?.tool_name;
          if (tool) {
              this.toolsUsed.add(tool);
              
              if (tool === 'Bash' || tool === 'bash') {
                  const command = props?.input?.command || props?.tool_input?.command;
                  if (command) this.commandsExecuted.push(redactString(command));
              }
              
              if (['Edit', 'Write', 'edit', 'write'].includes(tool)) {
                  const path = props?.input?.file_path || props?.input?.path || 
                               props?.tool_input?.file_path || props?.tool_input?.path;
                  if (path) this.filesChanged.add(path);
              }
          }
      }

      this.writeEvent(anyEvent.type, redactObject(payload));
  }

  /**
   * Log tool execution from tool.execute.after hook
   *
   * Input structure: { tool: string; sessionID: string; callID: string }
   * Output structure: { title: string; output: string; metadata: any }
   */
  public logToolExecution(
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: any }
  ): void {
      const toolName = input.tool;
      const sessionId = this.sessionId;
      
      this.toolsUsed.add(toolName);

      // Extract metadata - may contain additional tool info
      const metadata = output.metadata || {};

      // Logic to update agent mapping based on Task tool spawning subagents
      if (toolName === 'Task' && metadata?.subagent_type) {
          this.setAgentForSession(sessionId, metadata.subagent_type);
      } else if (toolName === 'subagent_stop' || toolName === 'stop') {
          this.setAgentForSession(sessionId, 'pai');
      }

      const payload = {
          tool_name: toolName,
          tool_title: output.title,
          tool_output: output.output,
          tool_metadata: metadata,
          call_id: input.callID,
      };

      this.writeEvent('ToolUse', redactObject(payload), toolName, metadata);
  }

  public async generateSessionSummary(): Promise<string | null> {
    try {
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/:/g, '')
        .replace(/\..+/, '')
        .replace('T', '-'); // YYYY-MM-DD-HHMMSS

      const yearMonth = timestamp.substring(0, 7);
      const date = timestamp.substring(0, 10);
      const time = timestamp.substring(11).replace(/-/g, ':');
      const duration = Math.round((Date.now() - this.startTime) / 60000);

      const sessionDir = join(HISTORY_DIR, 'sessions', yearMonth);
      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
      }

      const focus = this.filesChanged.size > 0 ? 'development' : 'research';
      const filename = `${timestamp}_SESSION_${focus}.md`;
      const filePath = join(sessionDir, filename);

      const summary = `---
capture_type: SESSION
timestamp: ${new Date().toISOString()}
session_id: ${this.sessionId}
duration_minutes: ${duration}
executor: pai
---

# Session: ${focus}

**Date:** ${date}
**Time:** ${time}
**Session ID:** ${this.sessionId}

---

## Session Overview

**Focus:** ${focus === 'development' ? 'Software development and code modification' : 'Research and general assistance'}
**Duration:** ${duration} minutes

---

## Tools Used

${this.toolsUsed.size > 0 ? Array.from(this.toolsUsed).map(t => `- ${t}`).sort().join('\n') : '- None recorded'}

---

## Files Modified

${this.filesChanged.size > 0 ? Array.from(this.filesChanged).map(f => `- \`${f}\``).sort().join('\n') : '- None recorded'}

**Total Files Changed:** ${this.filesChanged.size}

---

## Commands Executed

${this.commandsExecuted.length > 0 ? '```bash\n' + this.commandsExecuted.slice(0, 20).join('\n') + '\n```' : 'None recorded'}

---

## Notes

This session summary was automatically generated by the PAI OpenCode Plugin.

---

**Session Outcome:** Completed
**Generated:** ${new Date().toISOString()}
`;

      writeFileSync(filePath, summary);
      return filePath;
    } catch (error) {
      this.logError('SessionSummary', error);
      return null;
    }
  }

  public async processAssistantMessage(content: string): Promise<void> {
    try {
      const sections = this.parseStructuredResponse(content);
      if (Object.keys(sections).length === 0) return;

      const agentRole = this.getAgentForSession(this.sessionId);
      const isLearning = this.isLearningCapture(sections);
      const type = this.determineArtifactType(agentRole, isLearning, sections);

      await this.createArtifact(type, content, sections);
    } catch (error) {
      this.logError('ProcessAssistantMessage', error);
    }
  }

  private parseStructuredResponse(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const sectionHeaders = [
      'SUMMARY', 'ANALYSIS', 'ACTIONS', 'RESULTS', 'STATUS', 'CAPTURE', 'NEXT', 'STORY EXPLANATION', 'COMPLETED'
    ];

    for (const header of sectionHeaders) {
      const regex = new RegExp(`${header}:\\s*([\\s\\S]*?)(?=\\n(?:${sectionHeaders.join('|')}):|$)`, 'i');
      const match = content.match(regex);
      if (match && match[1]) {
        sections[header] = match[1].trim();
      }
    }

    return sections;
  }

  private isLearningCapture(sections: Record<string, string>): boolean {
    const indicators = ['fixed', 'solved', 'discovered', 'lesson', 'troubleshoot', 'debug', 'root cause', 'learning', 'bug', 'issue', 'resolved'];
    const textToSearch = ((sections['ANALYSIS'] || '') + ' ' + (sections['RESULTS'] || '')).toLowerCase();

    let count = 0;
    for (const indicator of indicators) {
      if (textToSearch.includes(indicator)) {
        count++;
      }
    }

    return count >= 2;
  }

  private determineArtifactType(agentRole: string, isLearning: boolean, sections: Record<string, string>): string {
    const summary = (sections['SUMMARY'] || '').toLowerCase();
    
    if (agentRole === 'architect') return 'DECISION';
    if (agentRole === 'researcher' || agentRole === 'pentester') return 'RESEARCH';
    if (agentRole === 'engineer' || agentRole === 'designer') {
      if (summary.includes('fix') || summary.includes('bug') || summary.includes('issue')) return 'BUG';
      if (summary.includes('refactor') || summary.includes('improve') || summary.includes('cleanup')) return 'REFACTOR';
      return 'FEATURE';
    }

    return isLearning ? 'LEARNING' : 'WORK';
  }

  private async createArtifact(type: string, content: string, sections: Record<string, string>): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '')
      .replace(/\..+/, '')
      .replace('T', '-');

    const yearMonth = timestamp.substring(0, 7);
    const summary = sections['SUMMARY'] || 'no-summary';
    const slug = summary.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const filename = `${timestamp}_${type}_${slug}.md`;
    
    let subdir = 'execution';
    if (type === 'LEARNING') subdir = 'learnings';
    else if (type === 'DECISION') subdir = 'decisions';
    else if (type === 'RESEARCH') subdir = 'research';
    else if (type === 'WORK') subdir = 'sessions';
    else {
      // For BUG, REFACTOR, FEATURE
      if (type === 'BUG') subdir = join('execution', 'bugs');
      else if (type === 'REFACTOR') subdir = join('execution', 'refactors');
      else subdir = join('execution', 'features');
    }

    const targetDir = join(HISTORY_DIR, subdir, yearMonth);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const filePath = join(targetDir, filename);
    const agentRole = this.getAgentForSession(this.sessionId);

    const frontmatter = `---
capture_type: ${type}
timestamp: ${new Date().toISOString()}
session_id: ${this.sessionId}
executor: ${agentRole}
${sections['SUMMARY'] ? `summary: ${sections['SUMMARY'].replace(/"/g, '\\"')}` : ''}
---

${content}
`;

    writeFileSync(filePath, redactString(frontmatter), 'utf-8');
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
