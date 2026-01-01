import type { Event } from '@opencode-ai/sdk';
export declare class Logger {
    private sessionId;
    private worktree;
    private toolsUsed;
    private filesChanged;
    private commandsExecuted;
    private processedMessageIds;
    private startTime;
    constructor(sessionId: string, worktree?: string);
    private getHistoryDir;
    processAssistantMessage(content: string, messageId?: string): Promise<void>;
    private getPSTTimestamp;
    private getEventsFilePath;
    private getSessionMappingFile;
    private getAgentForSession;
    private setAgentForSession;
    logOpenCodeEvent(event: Event): void;
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
    private parseStructuredResponse;
    private isLearningCapture;
    private determineArtifactType;
    private createArtifact;
    logError(context: string, error: any): void;
    private writeEvent;
    flush(): void;
}
