import os

filepath = 'src/lib/security.ts'
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
in_block_categories = False
in_ask_categories = False
in_validate_command = False

for line in lines:
    if 'const BLOCK_CATEGORIES' in line:
        in_block_categories = True
        new_lines.append('const ALL_PATTERNS = [\n')
        continue
    if in_block_categories:
        if '];' in line:
            in_block_categories = False
            # We'll add the dangerous_git category here
            new_lines.append("  { category: 'dangerous_git', patterns: DANGEROUS_GIT_PATTERNS },\n")
            new_lines.append('];\n')
        else:
            new_lines.append(line)
        continue
    
    if 'const ASK_CATEGORIES' in line:
        in_ask_categories = True
        continue
    if in_ask_categories:
        if '];' in line:
            in_ask_categories = False
        continue

    if 'export function validateCommand' in line:
        in_validate_command = True
        new_lines.append(line)
        new_lines.append("  for (const { category, patterns } of ALL_PATTERNS) {\n")
        new_lines.append("    for (const pattern of patterns) {\n")
        new_lines.append("      if (pattern.test(command)) {\n")
        new_lines.append("        return {\n")
        new_lines.append("          status: 'ask',\n")
        new_lines.append("          category,\n")
        new_lines.append("          feedback: `⚠️ DANGEROUS: Detected ${category} pattern. Operation requires human confirmation. Command: ${redactString(command).slice(0, 50)}...`,\n")
        new_lines.append("        };\n")
        new_lines.append("      }\n")
        new_lines.append("    }\n")
        new_lines.append("  }\n")
        new_lines.append("  return { status: 'allow' };\n")
        new_lines.append("}\n")
        break # Skip the rest of the original function
    
    new_lines.append(line)

with open(filepath, 'w') as f:
    f.writelines(new_lines)
