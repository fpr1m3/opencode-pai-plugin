# OpenCode PAI Plugin

This plugin implements the core Personal AI Infrastructure (PAI) logic as a native OpenCode plugin.

## Installation

Install the plugin using your package manager:

```bash
bun add github:fpr1m3/opencode-pai-plugin
```

Or, clone the repository and build it manually:

```bash
git clone https://github.com/fpr1m3/opencode-pai-plugin.git
cd opencode-pai-plugin
bun install
bun run build
```

## Usage

Create a new file in your project at `.opencode/plugin/my-plugin.ts` and add the following code to register the plugin:

```typescript
import { PaiPlugin } from "opencode-pai-plugin";

export default PaiPlugin;
```

Once installed and registered, the plugin will automatically:

*   Load the `CORE/SKILL.md` file as core context at the start of each session.
*   Log all events and tool calls to the `.opencode/history/raw-outputs` directory.
*   Update the terminal tab title with the current session status.
*   Create a session summary in `.opencode/history/sessions` when a session ends.
