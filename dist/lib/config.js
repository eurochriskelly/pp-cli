"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigDir = ensureConfigDir;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getProfile = getProfile;
exports.loadSession = loadSession;
exports.saveSession = saveSession;
exports.getCurrentSession = getCurrentSession;
exports.setSession = setSession;
exports.clearSession = clearSession;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const yaml = __importStar(require("js-yaml"));
const CONFIG_DIR = (0, path_1.join)((0, os_1.homedir)(), '.pp-cli');
const CONFIG_FILE = (0, path_1.join)(CONFIG_DIR, 'config.yaml');
const SESSION_FILE = (0, path_1.join)(CONFIG_DIR, 'session.json');
const DEFAULT_CONFIG = {
    default: {
        apiUrl: 'http://localhost:4001',
        outputFormat: 'table',
        timeout: 30000
    },
    profiles: {}
};
async function ensureConfigDir() {
    try {
        await fs_1.promises.mkdir(CONFIG_DIR, { recursive: true });
    }
    catch (error) {
        // Directory might already exist
    }
}
async function loadConfig() {
    await ensureConfigDir();
    try {
        const content = await fs_1.promises.readFile(CONFIG_FILE, 'utf-8');
        const parsed = yaml.load(content);
        return { ...DEFAULT_CONFIG, ...parsed };
    }
    catch (error) {
        // File doesn't exist or is invalid, return defaults
        return DEFAULT_CONFIG;
    }
}
async function saveConfig(config) {
    await ensureConfigDir();
    const content = yaml.dump(config);
    await fs_1.promises.writeFile(CONFIG_FILE, content, 'utf-8');
}
async function getProfile(config, profileName) {
    const name = profileName || config.default?.toString() || 'default';
    if (name === 'default') {
        return config.default;
    }
    return config.profiles[name] || config.default;
}
async function loadSession() {
    await ensureConfigDir();
    try {
        const content = await fs_1.promises.readFile(SESSION_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        return {
            currentProfile: 'default',
            sessions: {}
        };
    }
}
async function saveSession(session) {
    await ensureConfigDir();
    await fs_1.promises.writeFile(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
}
async function getCurrentSession(session) {
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
async function setSession(profile, userSession) {
    const session = await loadSession();
    session.currentProfile = profile;
    session.sessions[profile] = userSession;
    await saveSession(session);
}
async function clearSession(profile) {
    const session = await loadSession();
    if (profile) {
        delete session.sessions[profile];
        if (session.currentProfile === profile) {
            session.currentProfile = 'default';
        }
    }
    else {
        session.sessions = {};
        session.currentProfile = 'default';
    }
    await saveSession(session);
}
//# sourceMappingURL=config.js.map