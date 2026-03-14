import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import type { Config, ConfigProfile, Session, UserSession } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.pp-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');
const SESSION_FILE = join(CONFIG_DIR, 'session.json');

const DEFAULT_CONFIG: Config = {
  default: {
    apiUrl: 'http://localhost:4001',
    outputFormat: 'table',
    timeout: 30000
  },
  profiles: {}
};

export async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

export async function loadConfig(): Promise<Config> {
  await ensureConfigDir();
  
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = yaml.load(content) as Config;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (error) {
    // File doesn't exist or is invalid, return defaults
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  const content = yaml.dump(config);
  await fs.writeFile(CONFIG_FILE, content, 'utf-8');
}

export async function getProfile(config: Config, profileName?: string): Promise<ConfigProfile> {
  const name = profileName || config.default?.toString() || 'default';
  
  if (name === 'default') {
    return config.default;
  }
  
  return config.profiles[name] || config.default;
}

export async function loadSession(): Promise<Session> {
  await ensureConfigDir();
  
  try {
    const content = await fs.readFile(SESSION_FILE, 'utf-8');
    return JSON.parse(content) as Session;
  } catch (error) {
    return {
      currentProfile: 'default',
      sessions: {}
    };
  }
}

export async function saveSession(session: Session): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
}

export async function getCurrentSession(session: Session): Promise<UserSession | null> {
  const userSession = session.sessions[session.currentProfile];
  
  if (!userSession) {
    return null;
  }
  
  // Check if token is expired
  const expiresAt = new Date(userSession.expiresAt);
  if (expiresAt < new Date()) {
    return null;
  }
  
  return userSession;
}

export async function setSession(profile: string, userSession: UserSession): Promise<void> {
  const session = await loadSession();
  session.currentProfile = profile;
  session.sessions[profile] = userSession;
  await saveSession(session);
}

export async function clearSession(profile?: string): Promise<void> {
  const session = await loadSession();
  
  if (profile) {
    delete session.sessions[profile];
    if (session.currentProfile === profile) {
      session.currentProfile = 'default';
    }
  } else {
    session.sessions = {};
    session.currentProfile = 'default';
  }
  
  await saveSession(session);
}
