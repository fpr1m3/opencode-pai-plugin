import type { Plugin, Hooks } from '@opencode-ai/plugin';
import type { Event, TextPart } from '@opencode-ai/sdk';
import { Logger } from './lib/logger';

/**
 * Check if an event should be skipped to prevent recursive logging.
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
  let currentSessionId: string | null = null;

  const hooks: Hooks = {
    event: async ({ event }: { event: Event }) => {
      // Initialize Logger on session creation
      if (event.type === 'session.created') {
        currentSessionId = event.properties.info.id;
        logger = new Logger(currentSessionId, project.worktree);
      }

      // Handle generic event logging
      if (logger &&
          event.type !== 'message.part.updated' && // Don't log every keystroke/part update
          !shouldSkipEvent(event, currentSessionId)) {
        logger.logOpenCodeEvent(event);
      }
      
      // Handle session deletion
      if (event.type === 'session.deleted') {
        if (logger) {
            logger.flush();
        }
      }

      // Handle user message for tab title update
      // We check for message.part.updated where type is text
      if (event.type === 'message.part.updated') {
          const part = event.properties.part;

          if (part.type === 'text') {
              const prompt = part.text;
              let tabTitle = 'Processing request...';

              if (prompt) {
                const words = prompt.replace(/[^\w\s]/g, ' ').trim().split(/\s+/)
                  .filter(w => w.length > 2 && !['the', 'and', 'but', 'for', 'are', 'with', 'you', 'can'].includes(w.toLowerCase()))
                  .slice(0, 3);

                if (words.length > 0) {
                  tabTitle = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
                  if (words.length > 1) {
                    tabTitle += ' ' + words.slice(1).map(w => w.toLowerCase()).join(' ');
                  }
                  tabTitle += '...';
                }
              }

              const titleWithEmoji = '♻️ ' + tabTitle;
              // Update terminal title safely
              try {
                process.stderr.write(`\x1b]0;${titleWithEmoji}\x07`);
              } catch (e) {
                  // ignore
              }
          }
      }
    },

    "tool.execute.after": async (input, output) => {
        if (logger) {
            logger.logToolExecution(input, output);
        }
    },


  };
  return hooks;
};

export default PAIPlugin;