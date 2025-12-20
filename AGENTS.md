# PAI (Personal AI)

**Agent Name:** PAI
**Plugin:** `opencode-pai-plugin`
**Type:** Core Infrastructure

## Description
PAI is the core Personal AI Infrastructure agent implemented by this plugin. It serves as the primary interface for the OpenCode environment, managing session context, security, logging, and user interactions.

## Capabilities
- **Context Management**: Automatically loads the `skills/core/SKILL.md` file from `PAI_DIR`, performing dynamic variable substitution for personalized interaction.
- **Project Requirements**: Detects and loads `.opencode/dynamic-requirements.md` from the current project worktree to inject task-specific constraints.
- **Event Logging**: Logs all session events and tool executions to `PAI_DIR/history/raw-outputs` in an analytics-ready JSONL format.
- **Session Summarization**: Generates human-readable Markdown summaries in `PAI_DIR/history/sessions` when a session ends.
- **Security Validation**: Intercepts Bash commands via `permission.ask` to block dangerous patterns or require user confirmation.
- **Interactive Feedback**: Updates terminal tab titles in real-time during tool execution and provides a summary upon task completion.

## Configuration
The agent's behavior is controlled via environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAI_DIR` | Root directory for PAI skills and history | `$XDG_CONFIG_HOME/opencode` |
| `DA` | Name of your Digital Assistant | `PAI` |
| `ENGINEER_NAME` | Your name/identity | `Operator` |
| `DA_COLOR` | UI color theme for your DA | `blue` |

## Codebase Structure
- `src/index.ts`: The plugin entry point. Implements lifecycle hooks for events, permissions, and system prompt transformations.
- `src/lib/logger.ts`: Implements the JSONL logger and Markdown summary generator.
- `src/lib/security.ts`: Contains the security validation logic and attack patterns.
- `src/lib/paths.ts`: Centralized path resolution for the PAI directory structure.
- `src/lib/metadata-extraction.ts`: Utility for enriching events with agent-specific metadata.
