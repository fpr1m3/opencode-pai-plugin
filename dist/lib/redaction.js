/**
 * Redaction utility to scrub sensitive data from logs
 */
const SENSITIVE_KEYS = [
    'api_key', 'apikey', 'secret', 'token', 'password', 'passwd', 'pwd',
    'auth', 'credential', 'private_key', 'client_secret', 'access_key'
];
const SECRET_PATTERNS = [
    // AWS Access Key ID
    /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    // GitHub Personal Access Token (classic)
    /\bghp_[a-zA-Z0-9]{36}\b/g,
    // Generic Private Key
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
    // Bearer Token (simple heuristic - starts with Bearer, followed by base64-ish chars)
    /\bBearer\s+[a-zA-Z0-9\-\._~+/]+=*/g,
];
// Regex for Key-Value assignments like "key=value" or "key: value" where key is sensitive
// This catches "export AWS_SECRET_KEY=..." or JSON "password": "..."
// We construct this dynamically from SENSITIVE_KEYS
const SENSITIVE_KEY_PATTERN = new RegExp(`\\b([a-zA-Z0-9_]*(${SENSITIVE_KEYS.join('|')})[a-zA-Z0-9_]*)\\s*[:=]\\s*['"]?([^\\s'"]{8,})['"]?`, 'gi');
export function redactString(str) {
    if (!str)
        return str;
    let redacted = str;
    // 1. Redact specific patterns (like AWS keys)
    for (const pattern of SECRET_PATTERNS) {
        redacted = redacted.replace(pattern, '[REDACTED]');
    }
    // 2. Redact key-value pairs where key suggests sensitivity
    // We use a callback to preserve the key and redact the value
    redacted = redacted.replace(SENSITIVE_KEY_PATTERN, (match, key, keyword, value) => {
        // If value is already redacted, skip
        if (value === '[REDACTED]')
            return match;
        // Replace the value part with [REDACTED]
        return match.replace(value, '[REDACTED]');
    });
    return redacted;
}
export function redactObject(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'string') {
        return redactString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => redactObject(item));
    }
    if (typeof obj === 'object') {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
            // If the key itself is sensitive, redact the value blindly if it's a string/number
            const isSensitiveKey = SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k));
            if (isSensitiveKey && (typeof value === 'string' || typeof value === 'number')) {
                newObj[key] = '[REDACTED]';
            }
            else {
                newObj[key] = redactObject(value);
            }
        }
        return newObj;
    }
    return obj;
}
