export interface SecurityResult {
    status: 'allow' | 'deny' | 'ask';
    category?: string;
    feedback?: string;
}
/**
 * Validates if a path can be accessed based on the requested mode.
 */
export declare function validatePath(path: string, mode?: 'read' | 'write'): boolean;
export declare function validateCommand(command: string): SecurityResult;
