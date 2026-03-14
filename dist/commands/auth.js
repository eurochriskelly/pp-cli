"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthCommands = createAuthCommands;
const commander_1 = require("commander");
const config_js_1 = require("../lib/config.js");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
function createAuthCommands() {
    const authCmd = new commander_1.Command('auth')
        .description('Authentication commands');
    authCmd
        .command('login')
        .description('Login to the API')
        .requiredOption('-e, --email <email>', 'User email')
        .requiredOption('-p, --password <password>', 'User password')
        .action(async (options) => {
        try {
            const { client, session } = await (0, helpers_js_1.getApiClient)();
            if (!(0, utils_js_1.isValidEmail)(options.email)) {
                (0, utils_js_1.error)('Invalid email format');
                process.exit(1);
            }
            const result = await client.post('/api/auth/login', {
                email: options.email,
                password: options.password
            });
            const userSession = {
                token: result.token,
                userId: result.user.id,
                email: result.user.email,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
            await (0, config_js_1.setSession)(session.currentProfile, userSession);
            (0, utils_js_1.success)(`Logged in as ${result.user.email}`);
            (0, utils_js_1.info)(`User ID: ${result.user.id}`);
            (0, utils_js_1.info)(`Role: ${result.user.role}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    authCmd
        .command('logout')
        .description('Logout from the API')
        .action(async () => {
        try {
            const session = await (0, config_js_1.loadSession)();
            await (0, config_js_1.clearSession)(session.currentProfile);
            (0, utils_js_1.success)('Logged out successfully');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Logout failed';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    authCmd
        .command('whoami')
        .description('Show current user information')
        .action(async () => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const session = await (0, config_js_1.loadSession)();
            const userSession = await (0, config_js_1.getCurrentSession)(session);
            if (!userSession) {
                (0, utils_js_1.info)('Not logged in');
                return;
            }
            const user = await client.get('/api/auth/me');
            (0, utils_js_1.info)('Current user:');
            console.log((0, formatters_js_1.formatOutput)(user, { format: 'table' }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get user info';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return authCmd;
}
//# sourceMappingURL=auth.js.map