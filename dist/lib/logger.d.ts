import type { Event } from '@opencode-ai/sdk';
export declare class Logger {
    private sessionId;
    private toolsUsed;
    private filesChanged;
    private commandsExecuted;
    private startTime;
    constructor(sessionId: string);
    private getPSTTimestamp;
    private getEventsFilePath;
    private getSessionMappingFile;
    private getAgentForSession;
    private setAgentForSession;
    logEvent(event: Event): void;
    logOpenCodeEvent(event: Event): void;
    /**
     * Log tool execution from tool.execute.after hook
     *
     * Input structure: { tool: string; sessionID: string; callID: string }
     * Output structure: { title: string; output: string; metadata: any }
     */
    logToolExecution(input: {
        tool: string;
        sessionID: string;
        callID: string;
    }, output: {
        title: string;
        output: string;
        metadata: any;
    }): void;
    generateSessionSummary(): Promise<string | null>;
    processAssistantMessage(content: string): Promise<void>;
    private parseStructuredResponse;
    private isLearningCapture;
    private determineArtifactType;
    private createArtifact;
    logError(context: string, error: any): void;
    private writeEvent;
    flush(): void;
}
