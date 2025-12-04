import type { Plugin, Hooks } from '@opencode-ai/plugin';
import type { Event, UserMessage, TextPart } from '@opencode-ai/sdk';
import { Logger } from './lib/logger';

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

      if (logger && event.type !== 'message.part.updated') {
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