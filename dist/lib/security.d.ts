/**
 * Security Library for PAI Plugin
 * Ported from legacy security-validator.ts
 */
export interface SecurityResult {
    status: 'allow' | 'deny' | 'ask';
    category?: string;
    feedback?: string;
}
export declare function validatePath(path: string): boolean;
export declare function validateCommand(command: string): SecurityResult;
