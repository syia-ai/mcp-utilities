var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) { 
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var OAuth2Client = require('google-auth-library').OAuth2Client;
var fs = require('fs/promises');
var path = require('path');
var config = {};
try {
    config = require('./config.js').config || {};
}
catch (e) {
    config = {};
}
var readline = require('readline').promises;
var _a = require('process'), input = _a.stdin, output = _a.stdout;
var google = require('googleapis').google;
// __filename and __dirname are available by default in CommonJS
function promptIfMissing(promptText, currentValue, rl) {
    return __awaiter(this, void 0, void 0, function () {
        var value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (currentValue)
                        return [2 /*return*/, currentValue];
                    return [4 /*yield*/, rl.question(promptText)];
                case 1:
                    value = _a.sent();
                    return [2 /*return*/, value.trim()];
            }
        });
    });
}
function setupGmailOAuth() {
    return __awaiter(this, void 0, void 0, function () {
        var tokenPath, rl, clientId, clientSecret, redirectUris, scopes, tokenData, tokens, error_1, oauth2Client, authUrl, redirectUrl, url, code, tokens, gmail, profile, error_2, error_3;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    tokenPath = path.resolve(process.cwd(), 'mcp_gmail_token.pkl');
                    rl = readline.createInterface({ input: input, output: output });
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 18, , 19]);
                    return [4 /*yield*/, promptIfMissing('Enter your Google OAuth Client ID: ', (_a = config.oauth) === null || _a === void 0 ? void 0 : _a.clientId, rl)];
                case 2:
                    clientId = _e.sent();
                    return [4 /*yield*/, promptIfMissing('Enter your Google OAuth Client Secret: ', (_b = config.oauth) === null || _b === void 0 ? void 0 : _b.clientSecret, rl)];
                case 3:
                    clientSecret = _e.sent();
                    return [4 /*yield*/, promptIfMissing('Enter your Redirect URI: ', (_c = config.oauth) === null || _c === void 0 ? void 0 : _c.redirectUris, rl)];
                case 4:
                    redirectUris = (_e.sent());
                    return [4 /*yield*/, promptIfMissing('Enter your OAuth Scopes: ', (_d = config.oauth) === null || _d === void 0 ? void 0 : _d.scopes, rl)];
                case 5:
                    scopes = _e.sent();
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, fs.readFile(tokenPath)];
                case 7:
                    tokenData = _e.sent();
                    tokens = JSON.parse(tokenData.toString('utf-8'));
                    // Check if token is expired
                    if (tokens.expiry_date && tokens.expiry_date > Date.now()) {
                        console.log('✅ Existing valid token found!');
                        rl.close();
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _e.sent();
                    return [3 /*break*/, 9];
                case 9:
                    oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUris.split(',')[0]);
                    authUrl = oauth2Client.generateAuthUrl({
                        access_type: 'offline',
                        scope: scopes.split(',').map(function (s) { return s.trim(); }),
                    });
                    console.log('Gmail OAuth Setup');
                    console.log('================');
                    console.log('1. Open this URL in your browser:');
                    console.log(authUrl);
                    console.log('\n2. After authorization, you will be redirected to a localhost URL');
                    console.log('3. Copy the entire redirect URL and paste it here');
                    _e.label = 10;
                case 10:
                    _e.trys.push([10, 15, 16, 17]);
                    return [4 /*yield*/, rl.question('\nPaste the redirect URL here: ')];
                case 11:
                    redirectUrl = _e.sent();
                    url = new URL(redirectUrl);
                    code = url.searchParams.get('code');
                    if (!code) {
                        throw new Error('No authorization code found in the redirect URL');
                    }
                    return [4 /*yield*/, oauth2Client.getToken(code)];
                case 12:
                    tokens = (_e.sent()).tokens;
                    oauth2Client.setCredentials(tokens);
                    // Save tokens to file
                    return [4 /*yield*/, fs.writeFile(tokenPath, Buffer.from(JSON.stringify(tokens)), 'binary')];
                case 13:
                    // Save tokens to file
                    _e.sent();
                    console.log('\n✅ Gmail OAuth setup completed successfully!');
                    console.log("Tokens saved to: ".concat(tokenPath));
                    console.log('\nYou can now use the mail_communication tool.');
                    gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                    return [4 /*yield*/, gmail.users.getProfile({ userId: 'me' })];
                case 14:
                    profile = _e.sent();
                    console.log("\n\uD83D\uDCE7 Connected as: ".concat(profile.data.emailAddress));
                    return [3 /*break*/, 17];
                case 15:
                    error_2 = _e.sent();
                    console.error('❌ Failed to complete OAuth setup:', error_2);
                    throw error_2;
                case 16:
                    rl.close();
                    return [7 /*endfinally*/];
                case 17: return [3 /*break*/, 19];
                case 18:
                    error_3 = _e.sent();
                    console.error('❌ Failed to complete OAuth setup:', error_3);
                    rl.close();
                    throw error_3;
                case 19: return [2 /*return*/];
            }
        });
    });
}
module.exports = { setupGmailOAuth: setupGmailOAuth };
// Run setup if this file is executed directly
if (require.main === module) {
    setupGmailOAuth().catch(function (error) {
        console.error('Fatal error during OAuth setup:', error);
        process.exit(1);
    });
}
