# OpenCode PAI Plugin

This plugin implements the core Personal AI Infrastructure (PAI) logic as a native OpenCode plugin.

## Installation

1.  Build the plugin:
    ```bash
    cd plugins/opencode-pai
    bun run build
    ```
2.  Install the plugin:
    ```bash
    opencode plugins install ./plugins/opencode-pai
    ```

## Usage

Once installed, the plugin will automatically:

*   Load the `CORE/SKILL.md` file as core context at the start of each session.
*   Log all events and tool calls to the `.opencode/history/raw-outputs` directory.
*   Update the terminal tab title with the current session status.
*   Create a session summary in `.opencode/history/sessions` when a session ends.
