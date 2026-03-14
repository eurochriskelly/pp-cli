/**
 * Confirmation code store for destructive operations
 * Codes expire after 60 seconds and are persisted to disk
 */

import { loadSession, saveSession } from './config.js';
import type { Session } from '../types/index.js';

const CODE_EXPIRY_MS = 60 * 1000; // 60 seconds

/**
 * Generate a random 6-digit confirmation code
 */
export function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store a confirmation code for a tournament
 * Returns the generated code
 */
export async function storeConfirmationCode(tournamentId: string): Promise<string> {
  const session = await loadSession();
  
  // Initialize confirmationCodes if needed
  if (!session.confirmationCodes) {
    session.confirmationCodes = {};
  }
  
  // Clean up expired codes
  await cleanupExpiredCodes(session);
  
  const code = generateConfirmationCode();
  const now = Date.now();
  
  session.confirmationCodes[tournamentId] = {
    code,
    createdAt: now,
    expiresAt: now + CODE_EXPIRY_MS
  };
  
  await saveSession(session);
  
  return code;
}

/**
 * Verify a confirmation code for a tournament
 * Returns true if valid, false otherwise
 */
export async function verifyConfirmationCode(tournamentId: string, code: string): Promise<boolean> {
  const session = await loadSession();
  
  if (!session.confirmationCodes) {
    return false;
  }
  
  await cleanupExpiredCodes(session);
  
  const entry = session.confirmationCodes[tournamentId];
  if (!entry) {
    return false;
  }
  
  if (Date.now() > entry.expiresAt) {
    delete session.confirmationCodes[tournamentId];
    await saveSession(session);
    return false;
  }
  
  return entry.code === code;
}

/**
 * Clear a confirmation code for a tournament
 */
export async function clearConfirmationCode(tournamentId: string): Promise<void> {
  const session = await loadSession();
  
  if (session.confirmationCodes) {
    delete session.confirmationCodes[tournamentId];
    await saveSession(session);
  }
}

/**
 * Clean up all expired confirmation codes
 */
async function cleanupExpiredCodes(session: Session): Promise<void> {
  if (!session.confirmationCodes) {
    return;
  }
  
  const now = Date.now();
  let hasExpired = false;
  
  for (const [tournamentId, entry] of Object.entries(session.confirmationCodes)) {
    if (now > entry.expiresAt) {
      delete session.confirmationCodes[tournamentId];
      hasExpired = true;
    }
  }
  
  if (hasExpired) {
    await saveSession(session);
  }
}

/**
 * Get time remaining for a confirmation code in seconds
 * Returns 0 if code doesn't exist or is expired
 */
export async function getConfirmationTimeRemaining(tournamentId: string): Promise<number> {
  const session = await loadSession();
  
  if (!session.confirmationCodes) {
    return 0;
  }
  
  await cleanupExpiredCodes(session);
  
  const entry = session.confirmationCodes[tournamentId];
  if (!entry) {
    return 0;
  }
  
  const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}
