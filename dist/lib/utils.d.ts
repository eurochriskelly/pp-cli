export declare function success(message: string): void;
export declare function error(message: string): void;
export declare function warning(message: string): void;
export declare function info(message: string): void;
export declare function debug(obj: unknown): void;
export declare function formatDate(dateStr: string): string;
export declare function formatDateTime(dateStr: string): string;
export declare function truncate(str: string, maxLength: number): string;
export declare function parseId(id: string): number;
export declare function validateRequired(value: unknown, name: string): void;
export declare function isValidEmail(email: string): boolean;
/**
 * Extract error message from various error types
 * Handles Error instances, ApiError objects, and other error types
 */
export declare function getErrorMessage(err: unknown, defaultMessage: string): string;
/**
 * Check if error is an authentication error (401)
 */
export declare function isAuthError(err: unknown): boolean;
//# sourceMappingURL=utils.d.ts.map