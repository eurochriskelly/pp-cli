import type { Config, ConfigProfile, Session, UserSession } from '../types/index.js';
export declare function ensureConfigDir(): Promise<void>;
export declare function loadConfig(): Promise<Config>;
export declare function saveConfig(config: Config): Promise<void>;
export declare function getProfile(config: Config, profileName?: string): Promise<ConfigProfile>;
export declare function loadSession(): Promise<Session>;
export declare function saveSession(session: Session): Promise<void>;
export declare function getCurrentSession(session: Session): Promise<UserSession | null>;
export declare function setSession(profile: string, userSession: UserSession): Promise<void>;
export declare function clearSession(profile?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map