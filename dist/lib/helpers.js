"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiClient = getApiClient;
exports.assertOutputFormat = assertOutputFormat;
const config_js_1 = require("./config.js");
const api_client_js_1 = require("./api-client.js");
async function getApiClient() {
    const opts = global.ppOpts;
    const config = await (0, config_js_1.loadConfig)();
    const session = await (0, config_js_1.loadSession)();
    const profile = await (0, config_js_1.getProfile)(config, opts.profile);
    const userSession = await (0, config_js_1.getCurrentSession)(session);
    const apiUrl = opts.apiUrl || profile.apiUrl;
    const verbose = opts.verbose || false;
    const client = new api_client_js_1.ApiClient(apiUrl, userSession, profile.timeout, verbose);
    return { client, config, session };
}
function assertOutputFormat(format) {
    if (!format || !['table', 'json', 'yaml', 'csv'].includes(format)) {
        return 'table';
    }
    return format;
}
//# sourceMappingURL=helpers.js.map