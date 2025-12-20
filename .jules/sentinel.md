# Sentinel Journal

## 2025-12-20 - [Log Injection Prevention]
**Vulnerability:** Agent instance IDs extracted from user prompts were not validated, allowing potential injection of path traversal characters or scripts into logs.
**Learning:** Parsing metadata from unstructured text (prompts) is risky without strict validation, as prompts are fully user-controlled.
**Prevention:** Implemented strict allowlist validation (`^[a-zA-Z0-9\-_]+$`) for all extracted IDs before using them.
