import chalk from 'chalk';

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function debug(obj: unknown): void {
  if (process.env.DEBUG) {
    console.log(chalk.gray('DEBUG:'), obj);
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

export function parseId(id: string): number {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ID: "${id}". Must be a number.`);
  }
  return parsed;
}

export function validateRequired(value: unknown, name: string): void {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${name} is required`);
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract error message from various error types
 * Handles Error instances, ApiError objects, and other error types
 */
export function getErrorMessage(err: unknown, defaultMessage: string): string {
  // Check for ApiError objects (which have a message property but aren't Error instances)
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  
  // Check for standard Error instances
  if (err instanceof Error) {
    return err.message;
  }
  
  return defaultMessage;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(err: unknown): boolean {
  return err !== null && 
         typeof err === 'object' && 
         'status' in err && 
         (err as { status: number }).status === 401;
}
