import os

filepath = 'README.md'
with open(filepath, 'r') as f:
    content = f.read()

# Update version in Quick Start
content = content.replace('@fpr1m3/opencode-pai-plugin@2.0.0', '@fpr1m3/opencode-pai-plugin@2.1.0')

# Update Config table
config_table_old = """| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAI_DIR` | Root directory for PAI skill and history | `$XDG_CONFIG_HOME/opencode` |
| `DA` | Name of your Digital Assistant | `PAI` |
| `ENGINEER_NAME` | Your name/identity | `Operator` |
| `DA_COLOR` | UI color theme for your DA | `blue` |"""

config_table_new = """| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAI_DIR` | Root directory for PAI skill and history | `$XDG_CONFIG_HOME/opencode` |
| `HISTORY_DIR` | Override directory for session logs | `$PAI_DIR/history` |
| `DA` | Name of your Digital Assistant | `PAI` |
| `ENGINEER_NAME` | Your name/identity | `Operator` |
| `DA_COLOR` | UI color theme for your DA | `blue` |
| `TIME_ZONE` | Timezone for log timestamps | `system` |
| `PAI_I_AM_DANGEROUS` | Enable YOLO mode (auto-approve tools) | `false` |"""

content = content.replace(config_table_old, config_table_new)

# Update Security section to mention HITL instead of Block
old_security = "*   **Safe-by-Default (HITL)**: All potentially dangerous tool executions require explicit human confirmation. Auto-approval (\"YOLO mode\") is disabled unless the `PAI_I_AM_DANGEROUS=true` environment variable is set."
new_security = "*   **Safe-by-Default (HITL)**: All potentially dangerous tool executions—including those matching the security firewall—require explicit human confirmation. The firewall has been tuned in v2.1.0 to prioritize human-in-the-loop (HITL) 'Ask' prompts over hard 'Deny' blocks to maintain agent flow. Auto-approval (\"YOLO mode\") is disabled unless the `PAI_I_AM_DANGEROUS=true` environment variable is set."

content = content.replace(old_security, new_security)

with open(filepath, 'w') as f:
    f.write(content)
