import { Command } from 'commander';
import { loadSession, getCurrentSession, setSession, clearSession } from '../lib/config.js';
import { getApiClient } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info, isValidEmail } from '../lib/utils.js';
import type { User, UserSession } from '../types/index.js';

export function createAuthCommands(): Command {
  const authCmd = new Command('auth')
    .description('Authentication commands');

  authCmd
    .command('login')
    .description('Login to the API')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-p, --password <password>', 'User password')
    .action(async (options) => {
      try {
        const { client, session } = await getApiClient();
        
        if (!isValidEmail(options.email)) {
          error('Invalid email format');
          process.exit(1);
        }
        
        const result = await client.post<{ token: string; user: User }>('/api/auth/login', {
          email: options.email,
          password: options.password
        });
        
        const userSession: UserSession = {
          token: result.token,
          userId: result.user.id,
          email: result.user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        await setSession(session.currentProfile, userSession);
        
        success(`Logged in as ${result.user.email}`);
        info(`User ID: ${result.user.id}`);
        info(`Role: ${result.user.role}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        error(message);
        process.exit(1);
      }
    });

  authCmd
    .command('logout')
    .description('Logout from the API')
    .action(async () => {
      try {
        const session = await loadSession();
        await clearSession(session.currentProfile);
        success('Logged out successfully');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Logout failed';
        error(message);
        process.exit(1);
      }
    });

  authCmd
    .command('whoami')
    .description('Show current user information')
    .action(async () => {
      try {
        const { client } = await getApiClient();
        const session = await loadSession();
        const userSession = await getCurrentSession(session);
        
        if (!userSession) {
          info('Not logged in');
          return;
        }
        
        const user = await client.get<User>('/api/auth/me');
        
        info('Current user:');
        console.log(formatOutput(user, { format: 'table' }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get user info';
        error(message);
        process.exit(1);
      }
    });

  return authCmd;
}
