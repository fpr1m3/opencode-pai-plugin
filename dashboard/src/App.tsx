import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Cpu, Database, Activity, FolderGit2, Hash, Settings, Mic, MoreVertical, Plus, StopCircle, Check, X, Info } from 'lucide-react';
import { opencode, Session, Message, MCPStatus, LSPStatus, Part } from './lib/opencode';

function Robot({ isSpeaking }: { isSpeaking: boolean }) {
    return (
        <div className={`relative w-24 h-24 flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'animate-robot-float scale-110' : ''}`}>
            {/* Robot Container */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                {/* Antenna */}
                <path d="M50 25 L50 15" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" className={isSpeaking ? 'animate-pulse' : ''} />
                <circle cx="50" cy="12" r="3" fill="#6366f1" className={isSpeaking ? 'animate-antenna-glow' : 'opacity-50'} />

                {/* Head */}
                <rect x="30" y="25" width="40" height="30" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

                {/* Eyes */}
                <g className="animate-eye-blink">
                    <circle cx="42" cy="38" r="3" fill={isSpeaking ? '#22c55e' : '#6366f1'} className="transition-colors duration-300" />
                    <circle cx="58" cy="38" r="3" fill={isSpeaking ? '#22c55e' : '#6366f1'} className="transition-colors duration-300" />
                </g>

                {/* Body */}
                <rect x="35" y="55" width="30" height="25" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

                {/* Chest pattern */}
                <rect x="40" y="62" width="20" height="2" fill="#3f3f46" opacity="0.5" />
                <rect x="40" y="68" width="12" height="2" fill="#3f3f46" opacity="0.5" />

                {/* Arms */}
                <path d="M30 60 L20 75" stroke="#3f3f46" strokeWidth="3" strokeLinecap="round" />
                <path d="M70 60 L80 75" stroke="#3f3f46" strokeWidth="3" strokeLinecap="round" />
            </svg>

            {/* Aura Effect when speaking */}
            {isSpeaking && (
                <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full scale-150 animate-pulse -z-10" />
            )}
        </div>
    );
}

export default function App() {
    const [input, setInput] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [mcpStatus, setMcpStatus] = useState<MCPStatus>({});
    const [lspStatus, setLspStatus] = useState<LSPStatus[]>([]);
    const [permissionRequest, setPermissionRequest] = useState<{ id: string, title?: string, message?: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async (sid: string) => {
        try {
            const msgs = await opencode.getMessages(sid);
            setMessages(msgs);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    useEffect(() => {
        // Initial data fetch
        const init = async () => {
            const sess = await opencode.getSessions();
            setSessions(sess);
            if (sess.length > 0) setActiveSessionId(sess[0].id);

            setMcpStatus(await opencode.getMCPStatus());
            setLspStatus(await opencode.getLSPStatus());
        };
        init();

        // Subscribe to SSE events
        const unsubscribe = opencode.subscribeToEvents((event) => {
            if (event.type === 'session.status') {
                if (event.properties?.sessionID === activeSessionId) {
                    setIsSpeaking(event.properties.status.type === 'busy');
                }
            }

            if (event.type === 'permission.ask') {
                setPermissionRequest({
                    id: event.properties.permissionID,
                    title: event.properties.title,
                    message: event.properties.message
                });
            }

            if (event.type === 'session.created' || event.type === 'session.updated' || event.type === 'session.deleted') {
                opencode.getSessions().then(setSessions);
            }

            if (event.type === 'mcp.status' || event.type === 'mcp.tools.changed') {
                opencode.getMCPStatus().then(setMcpStatus);
            }

            if (event.type === 'lsp.updated') {
                opencode.getLSPStatus().then(setLspStatus);
            }

            // Refresh messages if event is for current session
            if (activeSessionId && (event.properties?.sessionID === activeSessionId || event.properties?.info?.sessionID === activeSessionId)) {
                fetchMessages(activeSessionId);
            }
        });

        return () => unsubscribe();
    }, [activeSessionId]);

    useEffect(() => {
        if (activeSessionId) {
            fetchMessages(activeSessionId);
        }
    }, [activeSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !activeSessionId) return;
        const currentInput = input;
        setInput('');

        try {
            await opencode.sendMessage(activeSessionId, currentInput);
            fetchMessages(activeSessionId);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleNewSession = async () => {
        const sess = await opencode.createSession();
        setSessions(prev => [sess, ...prev]);
        setActiveSessionId(sess.id);
    };

    const handleAbort = async () => {
        if (activeSessionId) {
            await opencode.abortSession(activeSessionId);
            setIsSpeaking(false);
        }
    };

    const handlePermission = async (response: 'allow' | 'deny') => {
        if (permissionRequest && activeSessionId) {
            await opencode.approvePermission(activeSessionId, permissionRequest.id, response);
            setPermissionRequest(null);
        }
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-red-900 selection:text-white">

            {/* Permission Modal */}
            {permissionRequest && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-500">
                            <Info size={24} />
                            <h2 className="text-lg font-bold">{permissionRequest.title || 'Permission Required'}</h2>
                        </div>
                        <p className="text-zinc-300 mb-6 text-sm leading-relaxed">{permissionRequest.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handlePermission('deny')}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors border border-zinc-700"
                            >
                                Deny
                            </button>
                            <button
                                onClick={() => handlePermission('allow')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-all shadow-lg shadow-emerald-900/20"
                            >
                                Allow
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LEFT SIDEBAR: Sprite & Sessions --- */}
            <div className="w-72 flex flex-col border-r border-zinc-800 bg-zinc-900/50">
                <div className="h-64 border-b border-zinc-800 p-6 flex flex-col items-center justify-center bg-zinc-900 relative group">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-zinc-700 rounded"><Settings size={14} /></button>
                    </div>
                    <div className="w-32 h-32 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 border border-zinc-700/50 overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-indigo-500/10">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
                        <Robot isSpeaking={isSpeaking} />
                        <div className="absolute bottom-2 text-[8px] text-zinc-600 font-mono tracking-tighter">OPC_UNIT_v1.0</div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-sm font-bold text-zinc-300">OpenCode Agent</h2>
                        <span className="text-xs text-emerald-500 font-mono flex items-center justify-center gap-1">
                            <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isSpeaking ? 'animate-pulse' : ''}`}></span>
                            {isSpeaking ? 'THINKING' : 'ONLINE'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Sessions</h3>
                        <button onClick={handleNewSession} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-100 transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {sessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setActiveSessionId(session.id)}
                                className={`w-full text-left px-3 py-3 rounded-md text-sm transition-all border ${activeSessionId === session.id
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 shadow-sm'
                                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Hash size={14} className={activeSessionId === session.id ? 'text-blue-400' : 'text-zinc-600'} />
                                    <span className="truncate font-medium">{session.title || 'Untitled Session'}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 pl-6">
                                    {new Date(session.time.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CENTER: Main Chat --- */}
            <div className="flex-1 flex flex-col bg-zinc-950 relative">
                <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <Terminal size={18} className="text-zinc-400" />
                        <span className="font-mono text-sm text-zinc-300">workspace / {activeSession?.title || 'main'}</span>
                    </div>
                    <div className="flex gap-3">
                        <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400"><FolderGit2 size={18} /></button>
                        <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400"><MoreVertical size={18} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg) => (
                        <MessageItem key={msg.info.id} message={msg} />
                    ))}
                    {isSpeaking && (
                        <div className="flex gap-4 max-w-3xl animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-700 text-indigo-300">
                                <Cpu size={16} />
                            </div>
                            <div className="rounded-lg p-3 bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono">
                                Agent is generating...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                    <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Command or query..."
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-3 pl-4 pr-12 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono text-sm shadow-inner"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        {isSpeaking && (
                            <button
                                onClick={handleAbort}
                                className="p-3 bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/30 rounded-xl transition-all"
                                title="Stop Generation"
                            >
                                <StopCircle size={20} />
                            </button>
                        )}
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-zinc-600 font-mono">Agent connected to local runtime</p>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDEBAR: Animation & Status --- */}
            <div className="w-80 flex flex-col border-l border-zinc-800 bg-zinc-900/30">
                <div className="h-48 bg-black border-b border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,23,1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,23,1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
                    <div className="relative z-10 w-full flex items-center justify-center gap-6 h-32">
                        <div className="w-4 h-full flex items-center justify-center">
                            <div className={`w-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] rounded-sm transition-all duration-75 ease-linear ${isSpeaking ? 'animate-kitt-bar-outer' : 'h-8 opacity-40'}`} />
                        </div>
                        <div className="w-4 h-full flex items-center justify-center">
                            <div className={`w-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,1)] rounded-sm transition-all duration-75 ease-linear ${isSpeaking ? 'animate-kitt-bar-center' : 'h-10 opacity-50'}`} />
                        </div>
                        <div className="w-4 h-full flex items-center justify-center">
                            <div className={`w-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] rounded-sm transition-all duration-75 ease-linear ${isSpeaking ? 'animate-kitt-bar-outer' : 'h-8 opacity-40'}`} />
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-1 w-full animate-scan pointer-events-none"></div>
                    <div className="mt-2 flex items-center gap-2 relative z-20">
                        <Mic size={14} className={isSpeaking ? "text-red-500" : "text-zinc-600"} />
                        <span className={`text-[10px] font-mono tracking-widest uppercase ${isSpeaking ? "text-red-500 animate-pulse" : "text-zinc-600"}`}>
                            {isSpeaking ? "Voice Active" : "Listening"}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-zinc-900/20">
                    <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 sticky top-0 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={12} /> System Status
                        </h3>
                    </div>

                    <div className="p-4 space-y-6">
                        <div>
                            <h4 className="text-[10px] text-zinc-600 font-bold mb-3 uppercase">MCP Servers</h4>
                            <div className="space-y-2">
                                {Object.entries(mcpStatus).map(([name, info]) => (
                                    <StatusItem key={name} item={{ name, status: info.status }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] text-zinc-600 font-bold mb-3 uppercase">Language Servers</h4>
                            <div className="space-y-2">
                                {lspStatus.map(item => (
                                    <StatusItem key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageItem({ message }: { message: Message }) {
    const isAgent = message.info.role === 'assistant';

    return (
        <div className={`flex gap-4 max-w-4xl ${!isAgent ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isAgent ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                {isAgent ? <Cpu size={16} /> : <span className="text-xs font-bold">ME</span>}
            </div>
            <div className={`flex flex-col gap-2 max-w-[85%] ${!isAgent ? 'items-end' : ''}`}>
                {message.parts.map((part) => (
                    <PartRenderer key={part.id} part={part} isAgent={isAgent} />
                ))}
                {message.info.content && message.parts.length === 0 && (
                    <div className={`rounded-lg p-4 text-sm leading-relaxed border shadow-sm ${isAgent ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-blue-950/20 border-blue-900/30 text-blue-100'
                        }`}>
                        {message.info.content}
                    </div>
                )}
            </div>
        </div>
    );
}

function PartRenderer({ part, isAgent }: { part: Part, isAgent: boolean }) {
    switch (part.type) {
        case 'text':
            return (
                <div className={`rounded-lg p-4 text-sm leading-relaxed border shadow-sm whitespace-pre-wrap ${isAgent ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-blue-950/20 border-blue-900/30 text-blue-100'
                    }`}>
                    {part.text}
                </div>
            );
        case 'reasoning':
            return (
                <details className="w-full group">
                    <summary className="text-[10px] text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 transition-colors uppercase tracking-widest mb-1 list-none flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-open:bg-indigo-500 transition-colors"></span>
                        Agent Thoughts
                    </summary>
                    <div className="text-xs text-zinc-400 italic bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 mb-2 leading-relaxed">
                        {part.text}
                    </div>
                </details>
            );
        case 'tool':
            return (
                <div className={`flex items-center gap-3 border rounded-lg p-3 text-xs font-mono shadow-sm ${part.state.status === 'error' ? 'bg-red-950/10 border-red-900/20 text-red-300' :
                    part.state.status === 'completed' ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-300' :
                        'bg-indigo-950/10 border-indigo-900/20 text-indigo-300'
                    }`}>
                    {part.state.status === 'completed' ? <Check size={14} className="text-emerald-500" /> :
                        part.state.status === 'error' ? <X size={14} className="text-red-500" /> :
                            <Terminal size={14} className="text-indigo-500 animate-pulse" />}
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold truncate">EXE: {part.tool}</span>
                        <span className="opacity-60 text-[10px] truncate">
                            {part.state.status === 'completed' ? part.state.output :
                                part.state.status === 'error' ? part.state.error :
                                    JSON.stringify(part.state.input)}
                        </span>
                    </div>
                </div>
            );
        default:
            return (
                <div className="text-[10px] text-zinc-600 font-mono bg-zinc-900/30 px-2 py-1 rounded">
                    SKIPPED_PART: {part.type}
                </div>
            );
    }
}

function StatusItem({ item }: { item: any }) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'online':
            case 'connected': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'starting': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
            case 'idle': return 'bg-zinc-600';
            default: return 'bg-red-500';
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md group hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></div>
                    {item.status === 'starting' && (
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-500 animate-ping opacity-75"></div>
                    )}
                </div>
                <div>
                    <div className="text-xs font-medium text-zinc-300 group-hover:text-white">{item.name}</div>
                    <div className="text-[10px] text-zinc-600 font-mono uppercase">{item.status}</div>
                </div>
            </div>
            <Database size={12} className="text-zinc-700 group-hover:text-zinc-500" />
        </div>
    );
}
