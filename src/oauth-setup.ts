import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupGmailOAuth(): Promise<void> {
  const tokenPath = path.resolve(process.cwd(), 'mcp_gmail_token.pkl');
  
  try {
    // Check if token file exists and is valid
    try {
      const tokenData = await fs.readFile(tokenPath);
      const tokens = JSON.parse(tokenData.toString('utf-8'));
      
      // Check if token is expired
      if (tokens.expiry_date && tokens.expiry_date > Date.now()) {
        console.log('✅ Existing valid token found!');
        return;
      }
    } catch (error) {
      // Token file doesn't exist or is invalid, continue with new token generation
    }

    if (!config.oauth.clientId || !config.oauth.clientSecret) {
      throw new Error('OAuth client ID and secret must be configured');
    }

    const oauth2Client = new OAuth2Client(
      config.oauth.clientId,
      config.oauth.clientSecret,
      config.oauth.redirectUris ? config.oauth.redirectUris.split(',')[0] : 'http://localhost:3000/oauth2callback'
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [config.oauth.scopes],
    });

    console.log('Gmail OAuth Setup');
    console.log('================');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. After authorization, you will be redirected to a localhost URL');
    console.log('3. Copy the entire redirect URL and paste it here');

    // Create readline interface using promises
    const rl = readline.createInterface({ input, output });

    try {
      const redirectUrl = await rl.question('\nPaste the redirect URL here: ');
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code found in the redirect URL');
      }

      // Exchange auth code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Save tokens to file
      await fs.writeFile(tokenPath, Buffer.from(JSON.stringify(tokens)), 'binary');

      console.log('\n✅ Gmail OAuth setup completed successfully!');
      console.log(`Tokens saved to: ${tokenPath}`);
      console.log('\nYou can now use the mail_communication tool.');

      // Test the connection
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`\n📧 Connected as: ${profile.data.emailAddress}`);

    } catch (error) {
      console.error('❌ Failed to complete OAuth setup:', error);
      throw error;
    } finally {
      rl.close();
    }

  } catch (error) {
    console.error('❌ Failed to complete OAuth setup:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupGmailOAuth().catch((error) => {
    console.error('Fatal error during OAuth setup:', error);
    process.exit(1);
  });
} 