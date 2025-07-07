#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// Read package.json
const packagePath = join(packageRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

// Split version into parts
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Write updated package.json
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Version bumped to ${newVersion} in package.json`);

// Update version in src/index.ts
const indexPath = join(packageRoot, 'src', 'index.ts');
let indexContent = readFileSync(indexPath, 'utf8');

// Use regex to replace version in Server initialization
indexContent = indexContent.replace(
  /(name:\s*'mcp-utilities',\s*version:\s*)'[^']*'/,
  `$1'${newVersion}'`
);

writeFileSync(indexPath, indexContent);
console.log(`Version updated to ${newVersion} in src/index.ts`);

// Git commit and push
try {
  execSync('git add package.json src/index.ts', { stdio: 'inherit', cwd: packageRoot });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit', cwd: packageRoot });
  execSync('git push', { stdio: 'inherit', cwd: packageRoot });
  console.log('Changes committed and pushed to GitHub');
} catch (error) {
  console.error('Error during git operations:', error.message);
  process.exit(1);
}

// Publish to npm
try {
  execSync('npm publish', { stdio: 'inherit', cwd: packageRoot });
  console.log(`Successfully published version ${newVersion} to npm`);
} catch (error) {
  console.error('Error publishing to npm:', error.message);
  process.exit(1);
}

console.log('Release process completed successfully!');