/**
 * OpenCode API Client Utilities
 */

const API_BASE = '/api'; // Proxied via Vite

export interface Session {
    id: string;
    projectID: string;
    directory: string;
    parentID?: string;
    title?: string;
    time: {
        created: number;
        updated: number;
    };
}

export type PartType =
    | 'text'
    | 'reasoning'
    | 'tool'
    | 'file'
    | 'subtask'
    | 'step-start'
    | 'step-finish'
    | 'snapshot'
    | 'patch'
    | 'agent'
    | 'retry'
    | 'compaction';

export interface ToolPart {
    type: 'tool';
    id: string;
    tool: string;
    callID: string;
    state: {
        status: 'pending' | 'running' | 'completed' | 'error';
        input: any;
        output?: string;
        error?: string;
        title?: string;
        time: { start: number; end?: number };
    };
}

export interface TextPart {
    type: 'text';
    id: string;
    text: string;
}

export interface ReasoningPart {
    type: 'reasoning';
    id: string;
    text: string;
}

export type Part = TextPart | ReasoningPart | ToolPart | { type: Exclude<PartType, 'text' | 'reasoning' | 'tool'>; id: string;[key: string]: any };

export interface Message {
    info: {
        id: string;
        sessionID: string;
        role: 'user' | 'assistant';
        time: { created: number; completed?: number };
        content?: string;
        text?: string;
        agent: string;
    };
    parts: Part[];
}

export interface MCPStatus {
    [name: string]: {
        status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration';
        error?: string;
    };
}

export interface LSPStatus {
    id: string;
    name: string;
    status: 'connected' | 'error';
}

export const opencode = {
    async getSessions(): Promise<Session[]> {
        const res = await fetch(`${API_BASE}/session`);
        return res.json();
    },

    async createSession(title?: string, parentId?: string): Promise<Session> {
        const res = await fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, parentID: parentId })
        });
        return res.json();
    },

    async abortSession(id: string): Promise<boolean> {
        const res = await fetch(`${API_BASE}/session/${id}/abort`, { method: 'POST' });
        return res.json();
    },

    async getMessages(sessionId: string): Promise<Message[]> {
        const res = await fetch(`${API_BASE}/session/${sessionId}/message`);
        return res.json();
    },

    async getMCPStatus(): Promise<MCPStatus> {
        const res = await fetch(`${API_BASE}/mcp`);
        return res.json();
    },

    async getLSPStatus(): Promise<LSPStatus[]> {
        const res = await fetch(`${API_BASE}/lsp`);
        return res.json();
    },

    async sendMessage(sessionId: string, content: string) {
        const res = await fetch(`${API_BASE}/session/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parts: [{ type: 'text', text: content }]
            })
        });
        return res.json();
    },

    async approvePermission(sessionId: string, permissionId: string, response: 'allow' | 'deny', remember: boolean = false) {
        const res = await fetch(`${API_BASE}/session/${sessionId}/permissions/${permissionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response, remember })
        });
        return res.json();
    },

    subscribeToEvents(onEvent: (event: any) => void) {
        const eventSource = new EventSource(`${API_BASE}/event`);
        eventSource.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                onEvent(event);
            } catch (err) {
                console.error('Failed to parse event:', err);
            }
        };
        return () => eventSource.close();
    }
};
