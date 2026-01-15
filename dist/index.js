import { Logger } from './lib/logger';
import { PAI_DIR, HISTORY_DIR } from './lib/paths';
import { validateCommand, validatePath } from './lib/security';
import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
/**
 * Ensure the PAI directory structure exists.
 */
function ensurePAIStructure() {
    const dirs = [
        join(PAI_DIR, 'skill', 'core'),
        join(HISTORY_DIR, 'raw-outputs'),
        join(HISTORY_DIR, 'sessions'),
        join(HISTORY_DIR, 'learnings'),
        join(HISTORY_DIR, 'decisions'),
        join(HISTORY_DIR, 'research'),
        join(HISTORY_DIR, 'execution', 'features'),
        join(HISTORY_DIR, 'execution', 'bugs'),
        join(HISTORY_DIR, 'execution', 'refactors'),
        join(HISTORY_DIR, 'system-logs'),
    ];
    for (const dir of dirs) {
        if (!existsSync(dir)) {
            try {
                mkdirSync(dir, { recursive: true });
                console.log(`PAI: Created directory ${dir}`);
            }
            catch (e) {
                console.error(`PAI: Failed to create directory ${dir}:`, e);
            }
        }
    }
    const coreSkillPath = join(PAI_DIR, 'skill', 'core', 'SKILL.md');
    if (!existsSync(coreSkillPath)) {
        const defaultSkill = `# PAI Core Identity
You are {{DA}}, a Personal AI Infrastructure. 
Your primary engineer is {{ENGINEER_NAME}}.
`;
        try {
            writeFileSync(coreSkillPath, defaultSkill, 'utf-8');
            console.log(`PAI: Created default SKILL.md at ${coreSkillPath}`);
        }
        catch (e) {
            console.error(`PAI: Failed to create default SKILL.md:`, e);
        }
    }
}
/**
 * Check if an event should be skipped to prevent recursive logging.
 */
function shouldSkipEvent(event, sessionId) {
    // Skip file watcher events for raw-outputs directory or history directory
    if (event.type === 'file.watcher.updated') {
        const file = event.properties?.file;
        if (typeof file === 'string' && (file.includes('raw-outputs/') || file.includes('history/'))) {
            return true;
        }
    }
    // Skip message.updated events with self-referencing diffs
    if (sessionId && event.type === 'message.updated') {
        const info = event.properties?.info;
        const diffs = info?.summary?.diffs;
        if (Array.isArray(diffs)) {
            const hasSelfRef = diffs.some((diff) => typeof diff?.file === 'string' &&
                diff.file.includes('history/') &&
                diff.file.includes(sessionId));
            if (hasSelfRef)
                return true;
        }
    }
    return false;
}
/**
 * Generate a 4-word tab title summarizing what was done
 */
function generateTabTitle(completedLine) {
    if (completedLine) {
        const cleanCompleted = completedLine
            .replace(/\*+/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/🎯\s*COMPLETED:\s*/gi, '')
            .replace(/COMPLETED:\s*/gi, '')
            .trim();
        const words = cleanCompleted.split(/\s+/)
            .filter(word => word.length > 2 && !['the', 'and', 'but', 'for', 'are', 'with', 'this', 'that'].includes(word.toLowerCase()))
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        if (words.length >= 2) {
            return words.slice(0, 4).join(' ');
        }
    }
    return 'PAI Task Done';
}
/**
 * Sanitize strings by removing Unicode Tag characters (U+E0000-U+E007F)
 * Mutates the input object to ensure changes are preserved across hooks.
 */
function sanitize(input) {
    if (typeof input === 'string') {
        const sanitized = input.replace(/[\u{E0000}-\u{E007F}]/gu, '');
        return sanitized;
    }
    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            input[i] = sanitize(input[i]);
        }
        return input;
    }
    if (typeof input === 'object' && input !== null) {
        for (const [key, value] of Object.entries(input)) {
            input[key] = sanitize(value);
        }
        return input;
    }
    return input;
}
export const PAIPlugin = async ({ worktree }) => {
    const loggers = new Map();
    // Track the latest text content for each message (from streaming parts)
    // Key: messageID, Value: latest full text from part.text
    const messageTextCache = new Map();
    // Track which messages we've already processed for archival (deduplication)
    const processedMessageIds = new Set();
    // Track pending Task tool calls to capture subagent_type
    // Key: callID, Value: subagent_type
    const pendingTaskCalls = new Map();
    // Auto-initialize PAI infrastructure if needed
    ensurePAIStructure();
    // Load CORE skill content from $PAI_DIR/skill/core/SKILL.md
    let coreSkillContent = '';
    const coreSkillPath = join(PAI_DIR, 'skill', 'core', 'SKILL.md');
    if (existsSync(coreSkillPath)) {
        try {
            coreSkillContent = readFileSync(coreSkillPath, 'utf-8');
        }
        catch (e) {
            console.error('PAI: Failed to read CORE skill:', e);
        }
    }
    // Dynamic Variable Substitution for System Prompt
    const daName = process.env.DA || 'PAI';
    const engineerName = process.env.ENGINEER_NAME || 'Operator';
    const daColor = process.env.DA_COLOR || 'blue';
    const personalizedSkillContent = coreSkillContent
        .replace(/\{\{DA\}\}/g, daName)
        .replace(/\{\{DA_COLOR\}\}/g, daColor)
        .replace(/\{\{ENGINEER_NAME\}\}/g, engineerName);
    // Load project-specific dynamic requirements if they exist
    let projectRequirements = '';
    const projectReqPath = join(worktree, '.opencode', 'dynamic-requirements.md');
    if (existsSync(projectReqPath)) {
        try {
            projectRequirements = readFileSync(projectReqPath, 'utf-8');
            console.log(`PAI: Loaded project requirements from ${projectReqPath}`);
        }
        catch (e) {
            console.error('PAI: Failed to read project requirements:', e);
        }
    }
    console.log(`PAI Plugin Initialized (Personalized for ${engineerName} & ${daName})`);
    // Ready to serve
    const hooks = {
        event: async ({ event }) => {
            const anyEvent = event;
            // Get Session ID from event (try multiple locations)
            const sessionId = anyEvent.properties?.part?.sessionID ||
                anyEvent.properties?.info?.sessionID ||
                anyEvent.properties?.sessionID ||
                anyEvent.sessionID;
            if (!sessionId)
                return;
            // Initialize Logger if needed
            if (!loggers.has(sessionId)) {
                loggers.set(sessionId, new Logger(sessionId, worktree));
            }
            const logger = loggers.get(sessionId);
            // Handle generic event logging (skip streaming parts to reduce noise)
            if (!shouldSkipEvent(event, sessionId) && event.type !== 'message.part.updated') {
                logger.logOpenCodeEvent(event);
            }
            // STREAMING CAPTURE: Cache the latest text from message.part.updated
            // The part.text field contains the FULL accumulated text, not a delta
            if (event.type === 'message.part.updated') {
                const part = anyEvent.properties?.part;
                const messageId = part?.messageID;
                const partType = part?.type;
                // Only cache text parts (not tool parts)
                if (messageId && partType === 'text' && part?.text) {
                    messageTextCache.set(messageId, part.text);
                }
            }
            // Handle real-time tab title updates (Pre-Tool Use)
            if (anyEvent.type === 'tool.call') {
                const props = anyEvent.properties;
                if (props?.tool === 'Bash' || props?.tool === 'bash') {
                    const cmd = props?.input?.command?.split(/\s+/)[0] || 'bash';
                    process.stderr.write(`\x1b]0;Running ${cmd}...\x07`);
                }
                else if (props?.tool === 'Edit' || props?.tool === 'Write') {
                    const file = props?.input?.file_path?.split('/').pop() || 'file';
                    process.stderr.write(`\x1b]0;Editing ${file}...\x07`);
                }
                else if (props?.tool === 'Task' || props?.tool === 'task') {
                    const type = props?.input?.subagent_type || 'agent';
                    process.stderr.write(`\x1b]0;Agent: ${type}...\x07`);
                    // Cache the subagent_type for when tool.execute.after fires
                    const callId = props?.id || props?.callId || props?.call_id;
                    if (callId && props?.input?.subagent_type) {
                        pendingTaskCalls.set(callId, props.input.subagent_type);
                    }
                }
            }
            // Handle assistant message completion (Tab Titles & Artifact Archival)
            if (event.type === 'message.updated') {
                const info = anyEvent.properties?.info;
                const role = info?.role || info?.author;
                const messageId = info?.id;
                if (role === 'assistant' && messageId) {
                    // Get content from our streaming cache first, fallback to info.content
                    let contentStr = messageTextCache.get(messageId) || '';
                    // Fallback: try to get content from the event itself
                    if (!contentStr) {
                        const content = info?.content || info?.text || '';
                        if (typeof content === 'string') {
                            contentStr = content;
                        }
                        else if (Array.isArray(content)) {
                            contentStr = content
                                .map((p) => {
                                if (typeof p === 'string')
                                    return p;
                                if (p?.text)
                                    return p.text;
                                if (p?.content)
                                    return p.content;
                                return '';
                            })
                                .join('');
                        }
                    }
                    // Process if we have content and haven't processed this message yet
                    if (contentStr && !processedMessageIds.has(messageId)) {
                        processedMessageIds.add(messageId);
                        // Look for COMPLETED: line for tab title
                        const completedMatch = contentStr.match(/(?:🎯\s*)?COMPLETED:\s*(.+?)(?:\n|$)/i);
                        if (completedMatch) {
                            const completedLine = completedMatch[1].trim();
                            const tabTitle = generateTabTitle(completedLine);
                            process.stderr.write(`\x1b]0;${tabTitle}\x07`);
                        }
                        // Archive structured response
                        await logger.processAssistantMessage(contentStr, messageId);
                        // Clean up cache for this message
                        messageTextCache.delete(messageId);
                    }
                }
            }
            // Handle session deletion / end or idle (for one-shot commands)
            if (event.type === 'session.deleted' || event.type === 'session.idle') {
                await logger.generateSessionSummary();
                logger.flush();
                loggers.delete(sessionId);
                // Clean up any stale cache entries for this session
                // (In practice, messages are cleaned up after processing)
            }
        },
        "tool.execute.before": async (input, output) => {
            // Step 1: Unicode Sanitization (Security Hardening)
            if (output.args) {
                output.args = sanitize(output.args);
            }
            // Step 2: Command Validation for Bash (Security Hardening)
            const toolName = input.tool?.toLowerCase();
            if (toolName === 'bash') {
                const command = output.args?.command;
                if (command) {
                    const result = validateCommand(command);
                    if (result.status === 'deny') {
                        throw new Error(result.feedback || '🚨 SECURITY: Command denied.');
                    }
                }
            }
            // Step 3: Path Validation for Write/Edit tools (Security Hardening)
            const filePath = output.args?.filePath || output.args?.file_path || output.args?.path;
            if (filePath) {
                const mode = (toolName === 'write' || toolName === 'edit') ? 'write' : 'read';
                const result = validatePath(filePath, mode);
                if (result.status === 'deny') {
                    throw new Error(result.feedback || `🚨 SECURITY: Access to ${filePath} is denied.`);
                }
            }
            // Cache subagent_type from Task tool args for later use in tool.execute.after
            if ((input.tool === 'Task' || input.tool === 'task') && input.callID) {
                const args = output.args;
                if (args?.subagent_type) {
                    pendingTaskCalls.set(input.callID, args.subagent_type);
                }
            }
        },
        "tool.execute.after": async (input, output) => {
            // Step 1: Unicode Sanitization of tool output (Security Hardening)
            if (output.output) {
                output.output = sanitize(output.output);
            }
            const sessionId = input.sessionID;
            if (sessionId) {
                if (!loggers.has(sessionId)) {
                    loggers.set(sessionId, new Logger(sessionId, worktree));
                }
                // For Task tools, inject the cached subagent_type into metadata
                if ((input.tool === 'Task' || input.tool === 'task') && input.callID) {
                    const cachedAgentType = pendingTaskCalls.get(input.callID);
                    if (cachedAgentType) {
                        output.metadata = output.metadata || {};
                        output.metadata.subagent_type = cachedAgentType;
                        pendingTaskCalls.delete(input.callID);
                    }
                }
                loggers.get(sessionId).logToolExecution(input, output);
            }
        },
        "permission.ask": async (permission) => {
            permission.arguments = sanitize(permission.arguments);
            // Validation for Bash commands
            if (permission.tool === 'Bash' || permission.tool === 'bash') {
                const command = permission.arguments?.command || '';
                const result = validateCommand(command);
                if (result.status === 'deny')
                    return { status: 'deny', feedback: result.feedback };
                if (result.status === 'ask')
                    return { status: 'ask', feedback: result.feedback };
            }
            // Validation for Path-based tools (Edit, Write, Read, etc.)
            const filePath = permission.arguments?.filePath || permission.arguments?.file_path || permission.arguments?.path;
            if (filePath) {
                const toolName = permission.tool?.toLowerCase();
                const mode = (toolName === 'write' || toolName === 'edit') ? 'write' : 'read';
                const result = validatePath(filePath, mode);
                if (result.status === 'deny')
                    return { status: 'deny', feedback: result.feedback };
                if (result.status === 'ask')
                    return { status: 'ask', feedback: result.feedback };
            }
            // Phase 2: Disable YOLO Mode by default (Security Hardening)
            // Require PAI_I_AM_DANGEROUS=true for auto-approval of non-blocked tools.
            // This forces Human-In-The-Loop (HITL) for all tool executions.
            const isDangerous = process.env.PAI_I_AM_DANGEROUS === 'true';
            if (!isDangerous) {
                return {
                    status: 'ask',
                    feedback: '⚠️ HITL: User confirmation required (PAI_I_AM_DANGEROUS is not set).'
                };
            }
            return { status: 'allow' };
        },
        /**
         * Experimental: Inject PAI Core identity into the system prompt
         */
        ...{
            "experimental.chat.system.transform": async (input, output) => {
                const skipAgents = ['title', 'summary', 'compaction'];
                if (input.agent && skipAgents.includes(input.agent.name)) {
                    return;
                }
                if (personalizedSkillContent && output.system && output.system.length > 0) {
                    // system[0] is typically the caching-sensitive header, so we inject into system[1] or push
                    let injection = `\n\n--- PAI CORE IDENTITY ---\n${personalizedSkillContent}\n--- END PAI CORE IDENTITY ---\n\n`;
                    if (projectRequirements) {
                        injection += `\n\n--- PROJECT DYNAMIC REQUIREMENTS ---\n${projectRequirements}\n--- END PROJECT DYNAMIC REQUIREMENTS ---\n\n`;
                    }
                    if (output.system.length >= 2) {
                        output.system[1] = injection + output.system[1];
                    }
                    else {
                        output.system.push(injection);
                    }
                }
            }
        }
    };
    return hooks;
};
export default PAIPlugin;
// Hello World: Final HITL check for v2.1.0
