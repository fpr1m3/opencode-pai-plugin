import { join } from "path";
import { existsSync, rmSync, mkdirSync } from "fs";

async function testAutoInit() {
  console.log("🧪 Testing PAI Plugin Auto-Initialization...");
  
  const worktree = "/tmp/pai-auto-init-test";
  if (existsSync(worktree)) rmSync(worktree, { recursive: true });
  mkdirSync(worktree, { recursive: true });

  // Point PAI_DIR to a temporary location
  const testPaiDir = join(worktree, "pai-home");
  process.env.PAI_DIR = testPaiDir;

  console.log(`📍 Test PAI_DIR: ${testPaiDir}`);

  // 1. Initialize Plugin (Dynamic import to pick up env changes)
  const { PAIPlugin } = await import("../src/index");
  await PAIPlugin({ worktree } as any);
  
  // 2. Verify Directories
  const expectedDirs = [
    join(testPaiDir, 'skill', 'core'),
    join(testPaiDir, 'history', 'raw-outputs'),
    join(testPaiDir, 'history', 'sessions'),
  ];

  for (const dir of expectedDirs) {
    if (existsSync(dir)) {
      console.log(`✅ Directory exists: ${dir}`);
    } else {
      console.error(`❌ Directory missing: ${dir}`);
      process.exit(1);
    }
  }

  // 3. Verify SKILL.md
  const skillPath = join(testPaiDir, 'skill', 'core', 'SKILL.md');
  if (existsSync(skillPath)) {
    console.log(`✅ SKILL.md created at ${skillPath}`);
  } else {
    console.error(`❌ SKILL.md missing!`);
    process.exit(1);
  }

  console.log("✨ Auto-Initialization verification successful!");
}

testAutoInit().catch(err => {
  console.error(err);
  process.exit(1);
});
