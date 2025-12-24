import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { Logger } from "../src/lib/logger";
import { PAI_DIR, HISTORY_DIR } from "../src/lib/paths";
import { existsSync, rmSync, readdirSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

describe("Logger UOCS Parsing", () => {
    const sessionId = "test-session-uocs";
    let logger: Logger;

    beforeEach(() => {
        if (existsSync(PAI_DIR)) {
            rmSync(PAI_DIR, { recursive: true, force: true });
        }
        mkdirSync(join(HISTORY_DIR, 'sessions'), { recursive: true });
        logger = new Logger(sessionId);
    });

    afterEach(() => {
        if (existsSync(PAI_DIR)) {
            rmSync(PAI_DIR, { recursive: true, force: true });
        }
    });

    test("should parse structured response correctly", async () => {
        const content = `
SUMMARY: This is a test summary.
ANALYSIS: I analyzed the problem and found a bug. I fixed it.
ACTIONS: Edited logger.ts.
RESULTS: The bug is fixed and tests pass.
STATUS: Completed.
CAPTURE: Learned about UOCS migration.
NEXT: Implement more features.
STORY EXPLANATION:
1. Step one
2. Step two
COMPLETED: Done correctly.
`;
        await logger.processAssistantMessage(content);

        // Check if artifact was created in learnings (since Analysis/Results contain "fixed" and "bug")
        const yearMonth = new Date().toISOString().substring(0, 7);
        const learningsDir = join(HISTORY_DIR, 'learnings', yearMonth);
        
        expect(existsSync(learningsDir)).toBe(true);
        const files = readdirSync(learningsDir);
        expect(files.length).toBe(1);
        expect(files[0]).toContain("LEARNING");
        expect(files[0]).toContain("this-is-a-test-summary");

        const artifactContent = readFileSync(join(learningsDir, files[0]), 'utf-8');
        expect(artifactContent).toContain("capture_type: LEARNING");
        expect(artifactContent).toContain("summary: This is a test summary.");
        expect(artifactContent).toContain("The bug is fixed and tests pass.");
    });

    test("should categorize as FEATURE for engineer with no bug keywords", async () => {
        // Mock agent role as engineer
        const mappingFile = join(PAI_DIR, 'agent-sessions.json');
        mkdirSync(PAI_DIR, { recursive: true });
        require('fs').writeFileSync(mappingFile, JSON.stringify({ [sessionId]: "engineer" }));

        const content = `
SUMMARY: Add new feature X.
ANALYSIS: Designing a new feature.
ACTIONS: Create file.ts.
RESULTS: Feature X is ready.
STATUS: Completed.
COMPLETED: Done correctly.
`;
        await logger.processAssistantMessage(content);

        const yearMonth = new Date().toISOString().substring(0, 7);
        const featuresDir = join(HISTORY_DIR, 'execution', 'features', yearMonth);
        
        expect(existsSync(featuresDir)).toBe(true);
        const files = readdirSync(featuresDir);
        expect(files.length).toBe(1);
        expect(files[0]).toContain("FEATURE");
    });
});
