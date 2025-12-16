# PAI (Personal AI)

**Agent Name:** PAI
**Plugin:** `opencode-pai-plugin`
**Type:** Core Infrastructure

## Description
PAI is the core Personal AI Infrastructure agent implemented by this plugin. It serves as the primary interface for the OpenCode environment, managing session context, logging, and user interactions.

## Capabilities
- **Context Management:** Automatically loads the `core/SKILL.md` file from the user's skills directory at the start of each session, injecting it as the core system prompt.
- **Event Logging:** Logs all session events, tool calls, and message updates to the `.opencode/history/raw-outputs` directory for audit and debugging purposes.
- **Session Status:** Updates the terminal tab title to reflect the current activity or thought process of the agent.
- **Session Summarization:** Generates a summary of the session in `.opencode/history/sessions` when a session ends (if configured).

## Configuration
The agent's behavior contains some configurable elements via environment variables or file templates:

| Configuration | Description |
| :--- | :--- |
| `core/SKILL.md` | The core system prompt/skill definition file located in `.opencode/skills/core/SKILL.md`. |
| `USER_NAME` | Environment variable to override the user's name (default: "Engineer"). |

## Codebase Structure
- `src/index.ts`: The plugin entry point. It defines the `PAIPlugin` export and sets up hooks for event listening (`event`, `chat.message`, `tool.execute.after`).
- `src/lib/context-loader.ts`: Responsible for reading and processing the `core/SKILL.md` file, injecting environment variables.
- `src/lib/logger.ts`: Implements a buffering JSONL logger. It captures events and tool outputs, writing them to `raw-outputs/{session-id}.jsonl`. It handles file creation and flushing.
- `src/lib/notifier.ts`: A utility to send POST requests to a local voice server (defaulting to `localhost:8888`). It fails gracefully (silently ignores errors) if the server is not unreachable.
- `src/lib/paths.ts`: Contains helper functions for resolving paths (`getHistoryDir`, `getRawOutputsDir`, `getSkillsDir`) and handling environment variable expansion in paths.
