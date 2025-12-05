import type { Plugin, Hooks } from '@opencode-ai/plugin';
import type { Event, UserMessage, TextPart } from '@opencode-ai/sdk';
import { Logger } from './lib/logger';

/**
 * Check if an event should be skipped to prevent recursive logging.
 * This handles:
 * 1. file.watcher.updated events for raw-outputs/ (would cause infinite loop)
 * 2. message.updated events with diffs referencing the session's own log file
 */
function shouldSkipEvent(event: Event, sessionId: string | null): boolean {
  // Skip file watcher events for raw-outputs directory
  if (event.type === 'file.watcher.updated') {
    const file = (event.properties as any)?.file;
    if (typeof file === 'string' && file.includes('raw-outputs/')) {
      return true;
    }
  }

  // Skip message.updated events with self-referencing diffs
  if (sessionId && event.type === 'message.updated') {
    const info = (event.properties as any)?.info;
    const diffs = info?.summary?.diffs;

    if (Array.isArray(diffs)) {
      const hasSelfRef = diffs.some((diff: any) =>
        typeof diff?.file === 'string' &&
        diff.file.includes('raw-outputs/') &&
        diff.file.includes(sessionId)
      );
      if (hasSelfRef) return true;
    }
  }

  return false;
}

export const PAIPlugin: Plugin = async ({ project, directory, $, client }) => {
  let logger: Logger | null = null;
  let lastAssistantMessageContent: string = '';
  let currentSessionId: string | null = null;

  const hooks: Hooks = {
    event: async ({ event }: { event: Event }) => {
      if (event.type === 'session.created') {
        currentSessionId = event.properties.info.id;
        logger = new Logger(currentSessionId, project.worktree);
      }

      // Skip logging events that would cause recursive file growth
      if (logger &&
          event.type !== 'message.part.updated' &&
          !shouldSkipEvent(event, currentSessionId)) {
        logger.logEvent(event);
      }
      
      if (event.type === 'message.part.updated' && event.properties.part.type === 'text') {
        const part = event.properties.part as TextPart;
        lastAssistantMessageContent = part.text;
      }

      if (event.type === 'session.status' && event.properties.status.type === 'idle' && lastAssistantMessageContent) {
        const title = `PAI: ${lastAssistantMessageContent.substring(0, 30)}...`;
        process.stderr.write(`\x1b]0;${title}\x07`);
        lastAssistantMessageContent = '';
      }

      if (event.type === 'session.deleted') {
        if (logger) {
            logger.flush();
        }
      }
    },
    "chat.message": async (input, output) => {
        if (output.message.role === 'user' && output.parts.length > 0) {
            const textPart = output.parts.find(p => p.type === 'text') as TextPart;
            if (textPart) {
                const title = `PAI: ${textPart.text.substring(0, 30)}...`;
                process.stderr.write(`\x1b]0;${title}\x07`);
            }
        }
    },

    "tool.execute.after": async (input, output) => {
        if (logger) {
            logger.logTool(input, output);
        }
    },


  };
  return hooks;
};

export default PAIPlugin;