import { loadConfig, loadSession, getProfile, getCurrentSession } from './config.js';
import { ApiClient } from './api-client.js';
import type { GlobalOptions, UserSession } from '../types/index.js';

export async function getApiClient(): Promise<{ client: ApiClient; config: Awaited<ReturnType<typeof loadConfig>>; session: Awaited<ReturnType<typeof loadSession>> }> {
  const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
  const config = await loadConfig();
  const session = await loadSession();
  const profile = await getProfile(config, opts.profile);
  const userSession: UserSession | null = await getCurrentSession(session);
  
  const apiUrl = opts.apiUrl || profile.apiUrl;
  const verbose = opts.verbose || false;
  const client = new ApiClient(apiUrl, userSession, profile.timeout, verbose);
  
  return { client, config, session };
}

export function assertOutputFormat(format: string | undefined): 'table' | 'json' | 'yaml' | 'csv' {
  if (!format || !['table', 'json', 'yaml', 'csv'].includes(format)) {
    return 'table';
  }
  return format as 'table' | 'json' | 'yaml' | 'csv';
}
