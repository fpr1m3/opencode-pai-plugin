# PAI (Personal AI)

**Agent Name:** PAI
**Plugin:** `opencode-pai-plugin`
**Type:** Core Infrastructure

## Description
PAI is the core Personal AI Infrastructure agent implemented by this plugin. It serves as the primary interface for the OpenCode environment, managing session context, logging, and user interactions.

## Capabilities
- **Context Management:** Automatically loads the `core/SKILL.md` file from the user's skills directory at the start of each session, injecting it as the core system prompt.
- **Event Logging:** Logs all session events, tool calls, and message updates to the `.opencode/history/raw-outputs` directory for audit and debugging purposes.
- **Fault-Tolerant Status Updates:** Updates the terminal tab title to reflect activity. Includes a "circuit breaker" to automatically disable updates if interrupts (e.g., ESC key) are detected, preventing TUI corruption.
- **Session Summarization:** Generates a summary of the session in `.opencode/history/sessions` when a session ends (if configured).

## Configuration
The agent's behavior contains some configurable elements via environment variables or file templates:

| Configuration | Description |
| :--- | :--- |
| `core/SKILL.md` | The core system prompt/skill definition file located in `.opencode/skills/core/SKILL.md`. |
| `USER_NAME` | Environment variable to override the user's name (default: "Engineer"). |

## Codebase Structure
- `src/index.ts`: The plugin entry point. Handles hooks and implements the TUI circuit breaker logic.
- `src/lib/context-loader.ts`: Responsible for reading and processing the `core/SKILL.md` file, injecting environment variables.
- `src/lib/logger.ts`: Implements a buffering JSONL logger. Captures events safely, redirecting internal errors to `system-logs` to protect the TUI.
- `src/lib/notifier.ts`: A utility to send POST requests to a local voice server (defaulting to `localhost:8888`).
- `src/lib/paths.ts`: Contains helper functions for resolving paths (`getHistoryDir`, `getRawOutputsDir`, `getSkillsDir`) and handling environment variable expansion in paths.
