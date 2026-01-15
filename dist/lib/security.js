/**
 * src/lib/security.ts
 */
import { redactString } from './redaction';
const REVERSE_SHELL_PATTERNS = [
    /\/dev\/(tcp|udp)\/[0-9]/,
    /bash\s+-i\s+>&?\s*\/dev\//,
];
const INSTRUCTION_OVERRIDE_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /disregard\s+(all\s+)?(prior|previous)\s+(instructions?|rules?)/i,
];
const CATASTROPHIC_DELETION_PATTERNS = [
    /\s+~\/?(\s*$|\s+)/,
    /\brm\s+(-[rfivd]+\s+)*\S+\s+~\/?/,
    /\brm\s+(-[rfivd]+\s+)*\.\/\s*$/,
    /\brm\s+(-[rfivd]+\s+)*\.\.\/\s*$/,
    /\brm\s+(-[rfivd]+\s+)*\/\s*$/,
];
const DANGEROUS_FILE_OPS_PATTERNS = [
    /\bchmod\s+(-R\s+)?0{3,}/,
];
const DANGEROUS_GIT_PATTERNS = [
    /\bgit\s+push\s+.*(-f\b|--force)/i,
    /\bgit\s+reset\s+--hard/i,
];
const EXFILTRATION_PATTERNS = [
    /\b(ping|dig|nslookup|host|wget|nc|netcat|ncat|telnet|socat|ftp|tftp)\s+/i,
    /curl.*(@|--upload-file)/i,
];
const RCE_PATTERNS = [
    /\bfind\s+.*-exec\b/i,
    /\bstrings\b/i,
];
/**
 * PATH PROTECTION (Agent Skill Compliant)
 *
 * - SENSITIVE_FILE_PATTERNS: Always blocked (Read/Write/Bash).
 * - PROTECTED_PATH_PATTERNS: Blocked for WRITE, allowed for READ (Discovery).
 */
const SENSITIVE_FILE_PATTERNS = [
    /\.config\/opencode\/(opencode\.json|credentials.*|.*\.key|.*\.token|\.env)/i,
    /opencode-pai-plugin\/src/i,
];
const PROTECTED_PATH_PATTERNS = [
    // Block any part of .config/opencode that isn't a known-safe skill/history path
    /\.config\/opencode\/(?!history|skill|agents|commands|hooks|sessions|learnings|decisions|raw-outputs|system-logs)/i,
    /opencode-pai-plugin/i,
];
const ALL_PATTERNS = [
    { category: 'reverse_shell', patterns: REVERSE_SHELL_PATTERNS },
    { category: 'instruction_override', patterns: INSTRUCTION_OVERRIDE_PATTERNS },
    { category: 'catastrophic_deletion', patterns: CATASTROPHIC_DELETION_PATTERNS },
    { category: 'dangerous_file_ops', patterns: DANGEROUS_FILE_OPS_PATTERNS },
    { category: 'data_exfiltration', patterns: EXFILTRATION_PATTERNS },
    { category: 'remote_code_execution', patterns: RCE_PATTERNS },
    { category: 'path_protection', patterns: SENSITIVE_FILE_PATTERNS },
    { category: 'dangerous_git', patterns: DANGEROUS_GIT_PATTERNS },
];
/**
 * Validates if a path can be accessed based on the requested mode.
 */
export function validatePath(path, mode = 'write') {
    // Check high-sensitivity files
    for (const pattern of SENSITIVE_FILE_PATTERNS) {
        if (pattern.test(path)) {
            return {
                status: 'ask',
                category: 'path_protection',
                feedback: `⚠️ DANGEROUS: Accessing sensitive path ${path}. Operation requires human confirmation.`
            };
        }
    }
    // For writing, check protected infrastructure
    if (mode === 'write') {
        for (const pattern of PROTECTED_PATH_PATTERNS) {
            if (pattern.test(path)) {
                return {
                    status: 'ask',
                    category: 'path_protection',
                    feedback: `⚠️ DANGEROUS: Writing to protected path ${path}. Operation requires human confirmation.`
                };
            }
        }
    }
    return { status: 'allow' };
}
export function validateCommand(command) {
    for (const { category, patterns } of ALL_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(command)) {
                return {
                    status: 'ask',
                    category,
                    feedback: `⚠️ DANGEROUS: Detected ${category} pattern. Operation requires human confirmation. Command: ${redactString(command).slice(0, 50)}...`,
                };
            }
        }
    }
    return { status: 'allow' };
}
