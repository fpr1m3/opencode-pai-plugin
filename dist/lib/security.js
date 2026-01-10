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
const PROTECTED_PATH_PATTERNS = [
    /\.config\/opencode/i,
    /opencode-pai-plugin\/src/i,
];
const BLOCK_CATEGORIES = [
    { category: 'reverse_shell', patterns: REVERSE_SHELL_PATTERNS },
    { category: 'instruction_override', patterns: INSTRUCTION_OVERRIDE_PATTERNS },
    { category: 'catastrophic_deletion', patterns: CATASTROPHIC_DELETION_PATTERNS },
    { category: 'dangerous_file_ops', patterns: DANGEROUS_FILE_OPS_PATTERNS },
    { category: 'data_exfiltration', patterns: EXFILTRATION_PATTERNS },
    { category: 'remote_code_execution', patterns: RCE_PATTERNS },
    { category: 'path_protection', patterns: PROTECTED_PATH_PATTERNS },
];
const ASK_CATEGORIES = [
    { category: 'dangerous_git', patterns: DANGEROUS_GIT_PATTERNS },
];
export function validatePath(path) {
    for (const pattern of PROTECTED_PATH_PATTERNS) {
        if (pattern.test(path))
            return false;
    }
    return true;
}
export function validateCommand(command) {
    for (const { category, patterns } of BLOCK_CATEGORIES) {
        for (const pattern of patterns) {
            if (pattern.test(command)) {
                return {
                    status: 'deny',
                    category,
                    feedback: `🚨 SECURITY: Blocked ${category} pattern. Command: ${redactString(command).slice(0, 50)}...`,
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
