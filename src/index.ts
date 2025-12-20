import type { Plugin, Hooks } from '@opencode-ai/plugin';
import type { Event } from '@opencode-ai/sdk';
import { Logger } from './lib/logger';
import { PAI_DIR } from './lib/paths';
import { validateCommand } from './lib/security';
import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';

/**
 * Ensure the PAI directory structure exists.
 */
function ensurePAIStructure() {
  const dirs = [
    join(PAI_DIR, 'skills', 'core'),
    join(PAI_DIR, 'history', 'raw-outputs'),
    join(PAI_DIR, 'history', 'sessions'),
    join(PAI_DIR, 'history', 'system-logs'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
        console.log(`PAI: Created directory ${dir}`);
      } catch (e) {
        console.error(`PAI: Failed to create directory ${dir}:`, e);
      }
    }
  }

  const coreSkillPath = join(PAI_DIR, 'skills', 'core', 'SKILL.md');
  if (!existsSync(coreSkillPath)) {
    const defaultSkill = `# PAI Core Identity
You are {{DA}}, a Personal AI Infrastructure. 
Your primary engineer is {{ENGINEER_NAME}}.
`;
    try {
      writeFileSync(coreSkillPath, defaultSkill, 'utf-8');
      console.log(`PAI: Created default SKILL.md at ${coreSkillPath}`);
    } catch (e) {
      console.error(`PAI: Failed to create default SKILL.md:`, e);
    }
  }
}

/**
 * Check if an event should be skipped to prevent recursive logging.
 */
function shouldSkipEvent(event: Event, sessionId: string | null): boolean {
  // Skip file watcher events for raw-outputs directory or history directory
  if (event.type === 'file.watcher.updated') {
    const file = (event.properties as any)?.file;
    if (typeof file === 'string' && (file.includes('raw-outputs/') || file.includes('history/'))) {
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
        diff.file.includes('history/') &&
        diff.file.includes(sessionId)
      );
      if (hasSelfRef) return true;
    }
  }

  return false;
}

/**
 * Generate a 4-word tab title summarizing what was done
 */
function generateTabTitle(completedLine?: string): string {
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

export const PAIPlugin: Plugin = async ({ worktree }) => {
  let logger: Logger | null = null;
  let currentSessionId: string | null = null;
  
  // Auto-initialize PAI infrastructure if needed
  ensurePAIStructure();
  
  // Load CORE skill content from $PAI_DIR/skills/core/SKILL.md
  let coreSkillContent = '';
  const coreSkillPath = join(PAI_DIR, 'skills', 'core', 'SKILL.md');
  if (existsSync(coreSkillPath)) {
    try {
      coreSkillContent = readFileSync(coreSkillPath, 'utf-8');
    } catch (e) {
      console.error('PAI: Failed to read CORE skill:', e);
    }
  }

  // Dynamic Variable Substitution for System Prompt
  const daName = process.env.DA || 'PAI';
  const engineerName = process.env.ENGINEER_NAME || 'Engineer';
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
    } catch (e) {
      console.error('PAI: Failed to read project requirements:', e);
    }
  }

  console.log(`PAI Plugin Initialized (Personalized for ${engineerName} & ${daName})`)
  
  const hooks: Hooks = {
    event: async ({ event }: { event: Event }) => {
      const anyEvent = event as any;

      // Initialize Logger on session creation
      if (event.type === 'session.created') {
        currentSessionId = anyEvent.properties.info.id;
        logger = new Logger(currentSessionId!);
      }

      // Handle generic event logging
      if (logger &&
        event.type !== 'message.part.updated' && 
        !shouldSkipEvent(event, currentSessionId)) {
        logger.logOpenCodeEvent(event);
      }

      // Handle real-time tab title updates (Pre-Tool Use)
      if (anyEvent.type === 'tool.call') {
        const props = anyEvent.properties;
        if (props?.tool === 'Bash' || props?.tool === 'bash') {
          const cmd = props?.input?.command?.split(/\s+/)[0] || 'bash';
          process.stderr.write(`\x1b]0;Running ${cmd}...\x07`);
        } else if (props?.tool === 'Edit' || props?.tool === 'Write') {
          const file = props?.input?.file_path?.split('/').pop() || 'file';
          process.stderr.write(`\x1b]0;Editing ${file}...\x07`);
        } else if (props?.tool === 'Task') {
          const type = props?.input?.subagent_type || 'agent';
          process.stderr.write(`\x1b]0;Agent: ${type}...\x07`);
        }
      }

      // Handle assistant completion (Tab Titles)
      if (event.type === 'message.updated') {
        const info = anyEvent.properties?.info;
        if (info?.author === 'assistant' && info?.content) {
          const content = typeof info.content === 'string' ? info.content : '';
          
          // Look for COMPLETED: line (can be prefaced by 🎯 or just text)
          const completedMatch = content.match(/(?:🎯\s*)?COMPLETED:\s*(.+?)(?:\n|$)/i);
          if (completedMatch) {
            const completedLine = completedMatch[1].trim();
            
            // Set Tab Title
            const tabTitle = generateTabTitle(completedLine);
            process.stderr.write(`\x1b]0;${tabTitle}\x07`);
          }
        }
      }

      // Handle session deletion / end
      if (event.type === 'session.deleted') {
        if (logger) {
          await logger.generateSessionSummary();
          logger.flush();
        }
      }
    },

    "tool.execute.after": async (input, output) => {
      if (logger) {
        logger.logToolExecution(input, output);
      }
    },

    "permission.ask": async (permission: any) => {
      if (permission.tool === 'Bash' || permission.tool === 'bash') {
        const command = permission.arguments?.command || '';
        const result = validateCommand(command);
        
        if (result.status === 'deny') {
          return { 
            status: 'deny',
            feedback: result.feedback 
          };
        }
        
        if (result.status === 'ask') {
          return { status: 'ask' };
        }
      }
      return { status: 'allow' };
    },

    /**
     * Experimental: Inject PAI Core identity into the system prompt
     */
    ...({
      "experimental.chat.system.transform": async (input: any, output: any) => {
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
          } else {
            output.system.push(injection);
          }
        }
      }
    } as any)
  };
  return hooks;
};

export default PAIPlugin;
