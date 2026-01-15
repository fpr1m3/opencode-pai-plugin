import os

filepath = 'tests/plugin.test.ts'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace("expect(result.feedback).toContain('SECURITY')", "expect(result.feedback).toContain('DANGEROUS')")

with open(filepath, 'w') as f:
    f.write(content)
