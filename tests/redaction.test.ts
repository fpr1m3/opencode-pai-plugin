import { describe, it, expect } from 'bun:test';
import { redactString, redactObject } from '../src/lib/redaction';

describe('Redaction Utility', () => {
  it('should redact AWS keys', () => {
    const input = 'export AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE';
    const output = redactString(input);
    expect(output).toContain('AWS_SECRET_KEY=[REDACTED]');
    expect(output).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('should redact sensitive key-value pairs', () => {
    const input = 'password="superSecretPassword"';
    const output = redactString(input);
    expect(output).toContain('password="[REDACTED]"');
    expect(output).not.toContain('superSecretPassword');
  });

  it('should redact generic secrets', () => {
    const input = 'my_secret_token = abcdef1234567890';
    const output = redactString(input);
    expect(output).toContain('my_secret_token = [REDACTED]');
    expect(output).not.toContain('abcdef1234567890');
  });

  it('should redact inside objects', () => {
    const input = {
      user: 'alice',
      credentials: {
        password: 'password123',
        apiKey: 'AKIAIOSFODNN7EXAMPLE'
      }
    };
    const output = redactObject(input);
    expect(output.user).toBe('alice');
    expect(output.credentials.password).toBe('[REDACTED]');
    expect(output.credentials.apiKey).toBe('[REDACTED]');
  });

  it('should not redact harmless values', () => {
    const input = 'user_id=123';
    const output = redactString(input);
    expect(output).toBe(input);
  });

  it('should redact short values in objects if key is sensitive', () => {
      const obj = { password: '123' };
      const output = redactObject(obj);
      expect(output.password).toBe('[REDACTED]');
  });

  it('should handle circular references', () => {
    const obj: any = { name: 'circular' };
    obj.self = obj;
    const output = redactObject(obj);
    expect(output.name).toBe('circular');
    expect(output.self).toBe('[CIRCULAR]');
  });

  it('should preserve Date objects', () => {
    const date = new Date('2023-01-01');
    const obj = { created_at: date };
    const output = redactObject(obj);
    expect(output.created_at).toEqual(date);
  });
});
