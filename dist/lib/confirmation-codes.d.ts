/**
 * Confirmation code store for destructive operations
 * Codes expire after 60 seconds and are persisted to disk
 */
/**
 * Generate a random 6-digit confirmation code
 */
export declare function generateConfirmationCode(): string;
/**
 * Store a confirmation code for a tournament
 * Returns the generated code (or the provided code if given)
 */
export declare function storeConfirmationCode(tournamentId: string, code?: string): Promise<string>;
/**
 * Verify a confirmation code for a tournament
 * Returns true if valid, false otherwise
 */
export declare function verifyConfirmationCode(tournamentId: string, code: string): Promise<boolean>;
/**
 * Clear a confirmation code for a tournament
 */
export declare function clearConfirmationCode(tournamentId: string): Promise<void>;
/**
 * Get time remaining for a confirmation code in seconds
 * Returns 0 if code doesn't exist or is expired
 */
export declare function getConfirmationTimeRemaining(tournamentId: string): Promise<number>;
//# sourceMappingURL=confirmation-codes.d.ts.map