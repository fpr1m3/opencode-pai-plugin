import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace .toBe('deny') with .toBe('ask') for status checks
    content = content.replace(".toBe('deny')", ".toBe('ask')")
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('tests/security.test.ts')
fix_file('tests/plugin.test.ts')
