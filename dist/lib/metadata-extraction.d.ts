/**
 * Metadata Extraction Library for UOCS Enhancement
 *
 * Extracts agent instance IDs, parent-child relationships, and session info
 * from Task tool calls and other tool inputs.
 *
 * Design Philosophy: Optional extraction with graceful fallbacks
 * - If instance IDs are present in descriptions/prompts, extract them
 * - If not present, fall back to agent type only
 * - Never fail - always return usable metadata
 */
export interface AgentInstanceMetadata {
    agent_instance_id?: string;
    agent_type?: string;
    instance_number?: number;
    parent_session_id?: string;
    parent_task_id?: string;
}
/**
 * Extract agent instance ID from Task tool input
 *
 * Looks for patterns in priority order:
 * 1. [agent-type-N] in description (e.g., "Research topic [perplexity-researcher-1]")
 * 2. [AGENT_INSTANCE: agent-type-N] in prompt
 * 3. subagent_type field (fallback to just type, no instance number)
 *
 * @param toolInput The tool input object from PreToolUse/PostToolUse hooks
 * @param description Optional description field from tool input
 * @returns Metadata object with extracted information
 */
export declare function extractAgentInstanceId(toolInput: any, description?: string): AgentInstanceMetadata;
/**
 * Enrich event with agent metadata
 *
 * Takes a base event object and adds agent instance metadata to it.
 * Returns a new object with merged metadata.
 *
 * @param event Base event object (from PreToolUse/PostToolUse)
 * @param toolInput Tool input object
 * @param description Optional description field
 * @returns Enriched event with agent metadata
 */
export declare function enrichEventWithAgentMetadata(event: any, toolInput: any, description?: string): any;
/**
 * Check if a tool call is spawning a subagent
 *
 * @param toolName Name of the tool being called
 * @param toolInput Tool input object
 * @returns true if this is a Task tool call spawning an agent
 */
export declare function isAgentSpawningCall(toolName: string, toolInput: any): boolean;
