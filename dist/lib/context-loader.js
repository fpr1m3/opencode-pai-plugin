import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getSkillsDir } from './paths';
export function getCoreContext(baseDir, env) {
    const skillsDir = getSkillsDir(baseDir);
    const coreSkillPath = join(skillsDir, 'core', 'SKILL.md');
    if (!existsSync(coreSkillPath)) {
        console.warn(`Core skill file not found at ${coreSkillPath}`);
        return '';
    }
    let content = readFileSync(coreSkillPath, 'utf-8');
    // Variable replacement
    const replacements = {
        '{{DA}}': env.DA_NAME || 'PAI',
        '{{ENGINEER_NAME}}': env.USER_NAME || env.USER || 'Engineer',
    };
    for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(key, value);
    }
    return content;
}
