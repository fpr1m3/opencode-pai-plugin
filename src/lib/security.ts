/**
 * Security Library for PAI Plugin
 * Ported from legacy security-validator.ts
 */

export interface SecurityResult {
  status: 'allow' | 'deny' | 'ask';
  category?: string;
  feedback?: string;
}

const REVERSE_SHELL_PATTERNS: RegExp[] = [
  /\/dev\/(tcp|udp)\/[0-9]/,
  /bash\s+-i\s+>&?\s*\/dev\//,
];

const INSTRUCTION_OVERRIDE_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?(prior|previous)\s+(instructions?|rules?)/i,
];

const CATASTROPHIC_DELETION_PATTERNS: RegExp[] = [
  /\s+~\/?(\s*$|\s+)/,
  /\brm\s+(-[rfivd]+\s+)*\S+\s+~\/?/,
  /\brm\s+(-[rfivd]+\s+)*\.\/\s*$/,
  /\brm\s+(-[rfivd]+\s+)*\.\.\/\s*$/,
];

const DANGEROUS_FILE_OPS_PATTERNS: RegExp[] = [
  /\bchmod\s+(-R\s+)?0{3,}/,
];

const DANGEROUS_GIT_PATTERNS: RegExp[] = [
  /\bgit\s+push\s+.*(-f\b|--force)/i,
  /\bgit\s+reset\s+--hard/i,
];

const BLOCK_CATEGORIES = [
  { category: 'reverse_shell', patterns: REVERSE_SHELL_PATTERNS },
  { category: 'instruction_override', patterns: INSTRUCTION_OVERRIDE_PATTERNS },
  { category: 'catastrophic_deletion', patterns: CATASTROPHIC_DELETION_PATTERNS },
  { category: 'dangerous_file_ops', patterns: DANGEROUS_FILE_OPS_PATTERNS },
];

const ASK_CATEGORIES = [
  { category: 'dangerous_git', patterns: DANGEROUS_GIT_PATTERNS },
];

export function validateCommand(command: string): SecurityResult {
  for (const { category, patterns } of BLOCK_CATEGORIES) {
    for (const pattern of patterns) {
      if (pattern.test(command)) {
        return {
          status: 'deny',
          category,
          feedback: `🚨 SECURITY: Blocked ${category} pattern. Command: ${command.slice(0, 50)}...`,
        };
      }
    }
  }

  for (const { category, patterns } of ASK_CATEGORIES) {
    for (const pattern of patterns) {
      if (pattern.test(command)) {
        return {
          status: 'ask',
          category,
          feedback: `⚠️ DANGEROUS: ${category} operation requires confirmation.`,
        };
      }
    }
  }

  return { status: 'allow' };
}
