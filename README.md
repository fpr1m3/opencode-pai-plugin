# OpenCode PAI Plugin

A native OpenCode plugin that implements the **Personal AI Infrastructure (PAI)** logic, replacing legacy hook scripts with a cohesive, lifecycle-aware system.

## Features

### 1. Identity & Context Injection
*   **Core Skill Loading**: Automatically injects your `skills/core/SKILL.md` (from `PAI_DIR`) into the system prompt.
*   **Dynamic Substitution**: Supports placeholders like `{{DA}}`, `{{DA_COLOR}}`, and `{{ENGINEER_NAME}}` for personalized interactions.
*   **Project Requirements**: Automatically detects and loads `.opencode/dynamic-requirements.md` from your current project, allowing for task-specific instructions.

### 2. Intelligent History & Logging
*   **Real-time Event Capture**: Logs all tool calls and SDK events to `PAI_DIR/history/raw-outputs` in an analytics-ready JSONL format.
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
| `PAI_DIR` | Root directory for PAI skills and history | `~/.claude` |
| `DA` | Name of your Digital Assistant | `PAI` |
| `ENGINEER_NAME` | Your name/identity | `Engineer` |
| `DA_COLOR` | UI color theme for your DA | `blue` |

## Installation

```bash
bun add github:fpr1m3/opencode-pai-plugin
```

## Usage

Register the plugin in your `.opencode/plugins.ts` (or equivalent):

```typescript
import { PAIPlugin } from "@opencode-ai/opencode-pai";

export default PAIPlugin;
```

---

**Note**: This plugin is designed to work with the PAI ecosystem and requires a valid `PAI_DIR` structure to function fully.
