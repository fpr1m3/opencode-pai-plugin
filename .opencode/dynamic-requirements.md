# Project Requirements: OpenCode PAI Plugin

## Technical Constraints
1. **Recursion Protection**: Ensure `shouldSkipEvent` always excludes any file operations within `PAI_DIR/history` to prevent infinite logging loops.
2. **TUI Protection**: All logic within hooks MUST be wrapped in try/catch blocks that redirect errors to the `system-logs` directory. Never throw errors that could disrupt the OpenCode user interface.
3. **Path Standard**: Always use the constants and helpers defined in `src/lib/paths.ts` for filesystem operations.
4. **Event Schema**: Every custom event logged must include `source_app: "pai"` and a `timestamp_pst` field.

## Workflow Rules
5. **Variable Substitution**: Any new identity-related features must support the `{{DA}}`, `{{DA_COLOR}}`, and `{{ENGINEER_NAME}}` placeholders.
6. **Performance**: Keep the `event` hook processing under 10ms to maintain real-time responsiveness.
7. **Security Patterns**: When updating `src/lib/security.ts`, ensure all new patterns are pre-compiled and fail-open on errors.
8. **Testing**: Updates to core logic should be accompanied by verification steps in `tests/plugin.test.ts`.
