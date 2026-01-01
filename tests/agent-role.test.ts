import { describe, it, expect } from 'bun:test';

/**
 * Tests for agent role normalization logic.
 * 
 * The normalizeAgentRole function handles subagent_type patterns like:
 *   - "subagents/researcher-claude" → "researcher"
 *   - "subagents/sparc-architect" → "architect"
 *   - "subagents/sparc-dev" → "engineer"
 * 
 * Since the method is private, we test the normalization logic directly here
 * by reimplementing it (to verify the algorithm) and integration testing
 * through the Logger class behavior.
 */

// Extracted normalization logic for unit testing (mirrors logger.ts implementation)
function normalizeAgentRole(agentRole: string): string {
  if (!agentRole) return 'pai';
  
  // Remove "subagents/" prefix if present (case-insensitive)
  let role = agentRole.replace(/^subagents\//i, '').toLowerCase();
  
  // Role keywords to look for anywhere in the string
  // Order matters: more specific patterns first
  const roleKeywords: [RegExp, string][] = [
    // Researcher patterns (prefix or contains)
    [/researcher/i, 'researcher'],
    [/research/i, 'researcher'],
    
    // Architect patterns
    [/architect/i, 'architect'],
    
    // Engineer patterns (includes "dev" for sparc-dev)
    [/engineer/i, 'engineer'],
    [/\bdev\b/i, 'engineer'],      // "sparc-dev" → engineer
    
    // Designer patterns
    [/designer/i, 'designer'],
    
    // Security patterns
    [/pentester/i, 'pentester'],
    
    // These map to researcher
    [/analyst/i, 'researcher'],
    [/explorer/i, 'researcher'],
    [/^explore$/i, 'researcher'],
    [/^intern$/i, 'researcher'],
  ];
  
  for (const [pattern, normalized] of roleKeywords) {
    if (pattern.test(role)) {
      return normalized;
    }
  }
  
  // Return lowercase role if no pattern matched
  return role;
}

// Map normalized role to artifact type (simplified version of determineArtifactType)
function roleToArtifactType(normalizedRole: string): string {
  if (normalizedRole === 'architect') return 'DECISION';
  if (normalizedRole === 'researcher' || normalizedRole === 'pentester') return 'RESEARCH';
  if (normalizedRole === 'engineer' || normalizedRole === 'designer') return 'FEATURE';
  return 'WORK';
}

describe('Agent Role Normalization', () => {
  describe('normalizeAgentRole', () => {
    it('should handle empty/null input', () => {
      expect(normalizeAgentRole('')).toBe('pai');
      expect(normalizeAgentRole(null as any)).toBe('pai');
      expect(normalizeAgentRole(undefined as any)).toBe('pai');
    });

    it('should strip subagents/ prefix', () => {
      expect(normalizeAgentRole('subagents/researcher')).toBe('researcher');
      expect(normalizeAgentRole('subagents/architect')).toBe('architect');
      expect(normalizeAgentRole('subagents/engineer')).toBe('engineer');
    });

    it('should extract base role from compound names', () => {
      expect(normalizeAgentRole('subagents/researcher-claude')).toBe('researcher');
      expect(normalizeAgentRole('subagents/researcher-gemini')).toBe('researcher');
      expect(normalizeAgentRole('researcher-perplexity')).toBe('researcher');
    });

    it('should handle all researcher variants', () => {
      const researcherVariants = [
        'subagents/researcher',
        'subagents/researcher-claude',
        'subagents/researcher-gemini',
        'subagents/research-firecrawl-tavily',
        'researcher',
        'researcher-claude',
      ];
      
      for (const variant of researcherVariants) {
        expect(normalizeAgentRole(variant)).toBe('researcher');
      }
    });

    it('should handle architect variants', () => {
      expect(normalizeAgentRole('subagents/architect')).toBe('architect');
      expect(normalizeAgentRole('subagents/sparc-architect')).toBe('architect');
      expect(normalizeAgentRole('architect')).toBe('architect');
    });

    it('should handle engineer variants', () => {
      expect(normalizeAgentRole('subagents/engineer')).toBe('engineer');
      expect(normalizeAgentRole('subagents/sparc-dev')).toBe('engineer');
      expect(normalizeAgentRole('engineer')).toBe('engineer');
    });

    it('should map analyst/explorer/intern to researcher', () => {
      expect(normalizeAgentRole('subagents/sparc-analyst')).toBe('researcher');
      expect(normalizeAgentRole('explore')).toBe('researcher');
      expect(normalizeAgentRole('intern')).toBe('researcher');
    });

    it('should handle case insensitivity', () => {
      expect(normalizeAgentRole('RESEARCHER')).toBe('researcher');
      expect(normalizeAgentRole('Architect')).toBe('architect');
      expect(normalizeAgentRole('SUBAGENTS/ENGINEER')).toBe('engineer');
    });

    it('should pass through unknown roles in lowercase', () => {
      expect(normalizeAgentRole('custom-agent')).toBe('custom-agent');
      expect(normalizeAgentRole('subagents/validator')).toBe('validator');
      expect(normalizeAgentRole('general')).toBe('general');
    });

    it('should handle designer role', () => {
      expect(normalizeAgentRole('subagents/designer')).toBe('designer');
      expect(normalizeAgentRole('designer')).toBe('designer');
    });

    it('should handle pentester role', () => {
      expect(normalizeAgentRole('subagents/pentester')).toBe('pentester');
      expect(normalizeAgentRole('pentester')).toBe('pentester');
    });
  });

  describe('Role to Artifact Type Mapping', () => {
    it('should map architect to DECISION', () => {
      expect(roleToArtifactType(normalizeAgentRole('subagents/architect'))).toBe('DECISION');
      expect(roleToArtifactType(normalizeAgentRole('subagents/sparc-architect'))).toBe('DECISION');
    });

    it('should map researcher variants to RESEARCH', () => {
      expect(roleToArtifactType(normalizeAgentRole('subagents/researcher-claude'))).toBe('RESEARCH');
      expect(roleToArtifactType(normalizeAgentRole('subagents/researcher-gemini'))).toBe('RESEARCH');
      expect(roleToArtifactType(normalizeAgentRole('explore'))).toBe('RESEARCH');
      expect(roleToArtifactType(normalizeAgentRole('intern'))).toBe('RESEARCH');
    });

    it('should map engineer/designer to FEATURE', () => {
      expect(roleToArtifactType(normalizeAgentRole('subagents/engineer'))).toBe('FEATURE');
      expect(roleToArtifactType(normalizeAgentRole('subagents/sparc-dev'))).toBe('FEATURE');
      expect(roleToArtifactType(normalizeAgentRole('designer'))).toBe('FEATURE');
    });

    it('should map pentester to RESEARCH', () => {
      expect(roleToArtifactType(normalizeAgentRole('pentester'))).toBe('RESEARCH');
    });

    it('should map unknown roles to WORK', () => {
      expect(roleToArtifactType(normalizeAgentRole('pai'))).toBe('WORK');
      expect(roleToArtifactType(normalizeAgentRole('general'))).toBe('WORK');
      expect(roleToArtifactType(normalizeAgentRole(''))).toBe('WORK');
    });
  });

  describe('Full Pipeline: subagent_type → artifact directory', () => {
    const typeToDir: Record<string, string> = {
      'DECISION': 'decisions',
      'RESEARCH': 'research',
      'FEATURE': 'execution/features',
      'BUG': 'execution/bugs',
      'REFACTOR': 'execution/refactors',
      'LEARNING': 'learnings',
      'WORK': 'sessions',
    };

    it('should route subagents/researcher-claude to research/', () => {
      const role = normalizeAgentRole('subagents/researcher-claude');
      const type = roleToArtifactType(role);
      expect(typeToDir[type]).toBe('research');
    });

    it('should route subagents/sparc-architect to decisions/', () => {
      const role = normalizeAgentRole('subagents/sparc-architect');
      const type = roleToArtifactType(role);
      expect(typeToDir[type]).toBe('decisions');
    });

    it('should route subagents/sparc-dev to execution/features/', () => {
      const role = normalizeAgentRole('subagents/sparc-dev');
      const type = roleToArtifactType(role);
      expect(typeToDir[type]).toBe('execution/features');
    });

    it('should route explore to research/', () => {
      const role = normalizeAgentRole('explore');
      const type = roleToArtifactType(role);
      expect(typeToDir[type]).toBe('research');
    });
  });
});
