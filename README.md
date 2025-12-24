# OpenCode PAI Plugin

A native OpenCode plugin that implements the **Personal AI Infrastructure (PAI)** logic, replacing legacy hook scripts with a cohesive, lifecycle-aware system.

## Credits & Inspiration

This project is an OpenCode-compatible clone of the hook system from **Dan Miessler's** [Personal AI Infrastructure (PAI)](https://github.com/danielmiessler/Personal_AI_Infrastructure) project. A massive shout out to Dan for the architectural vision and the original PAI patterns that this plugin brings to the OpenCode ecosystem.

---

**Disclaimer**: This project is independent and is **not** supported by, affiliated with, or endorsed by Dan Miessler or the OpenCode team.

## Features

### 1. Identity & Context Injection
*   **Core Skill Loading**: Automatically injects your `skills/core/SKILL.md` (from `PAI_DIR`) into the system prompt.
*   **Dynamic Substitution**: Supports placeholders like `{{DA}}`, `{{DA_COLOR}}`, and `{{ENGINEER_NAME}}` for personalized interactions.
*   **Project Requirements**: Automatically detects and loads `.opencode/dynamic-requirements.md` from your current project, allowing for task-specific instructions.

### 2. Intelligent History & Logging (UOCS)
*   **Real-time Event Capture**: Logs all tool calls and SDK events to `PAI_DIR/history/raw-outputs` in an analytics-ready JSONL format.
*   **Universal Output Capture System (UOCS)**: Automatically parses assistant responses for structured sections (SUMMARY, ANALYSIS, etc.) and generates artifacts in `decisions/`, `learnings/`, `research/`, or `execution/` based on context.
*   **Session Summaries**: Generates human-readable Markdown summaries in `PAI_DIR/history/sessions` at the end of every session, tracking files modified, tools used, and commands executed.
*   **Agent Mapping**: Tracks session-to-agent relationships (e.g., mapping a subagent session to its specialized type).

### 3. Security & Safety
*   **Security Validator**: A built-in firewall that scans Bash commands for dangerous patterns (reverse shells, recursive deletions, prompt injections) via the `permission.ask` hook.
*   **Safe Confirmations**: Automatically triggers a confirmation prompt for risky but potentially legitimate operations like forced Git pushes.

### 4. Interactive Feedback
*   **Real-time Tab Titles**: Updates your terminal tab title *instantly* when a tool starts (e.g., `Running bash...`, `Editing index.ts...`).
*   **Post-Task Summaries**: Updates the tab title with a concise summary of what was accomplished when a task is completed.

## Configuration

The plugin centers around the `PAI_DIR` environment variable.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAI_DIR` | Root directory for PAI skills and history | `$XDG_CONFIG_HOME/opencode` |
| `DA` | Name of your Digital Assistant | `PAI` |
| `ENGINEER_NAME` | Your name/identity | `Operator` |
| `DA_COLOR` | UI color theme for your DA | `blue` |

## Quick Start

Add the plugin to your global `opencode.json` configuration file (typically located at `~/.config/opencode/opencode.json`). OpenCode will automatically install the plugin from the registry on its next startup.

```json
{
  "plugin": [
    "@fpr1m3/opencode-pai-plugin@1.0.0"
  ]
}
```

Upon first run, the plugin will automatically:
1. Detect or create your `PAI_DIR` (default: `$XDG_CONFIG_HOME/opencode`).
2. Initialize the required directory structure for skills and history.
3. Create a default `SKILL.md` core identity if one does not exist.

## Development & Testing

We provide scripts to verify the plugin in a pristine environment:

*   `./scripts/create-test-env.sh`: Creates a fresh, isolated OpenCode project for testing.
*   `./scripts/test-full-flow.sh`: Runs a complete E2E verification of the plugin lifecycle.

## Roadmap / TODO

- [ ] **Voice Server Integration**: Implementation of the PAI voice notification server to provide audible feedback on task completion.
- [ ] **Enhanced Agent Mapping**: More granular tracking of subagent state transitions.

---

**Note**: This plugin is designed to work with the PAI ecosystem. While it auto-initializes a basic structure, you can customize your identity by editing `$PAI_DIR/skills/core/SKILL.md`.

---

Vibe coded with ❤️ by a mix of **Claude Code** and **OpenCode**.
