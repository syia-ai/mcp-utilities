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

// Git operations - create branch, commit, push and create PR
try {
  // Create a new branch with version number
  const branchName = `release-v${newVersion}`;
  execSync(`git checkout -b ${branchName}`, { stdio: 'inherit', cwd: packageRoot });
  console.log(`Created new branch: ${branchName}`);
  
  // Add and commit changes
  execSync('git add .', { stdio: 'inherit', cwd: packageRoot });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit', cwd: packageRoot });
  
  // Push the branch to remote
  execSync(`git push -u origin ${branchName}`, { stdio: 'inherit', cwd: packageRoot });
  console.log(`Pushed branch ${branchName} to GitHub`);
  
  // Create a pull request using GitHub CLI if available
  try {
    execSync(`gh pr create --title "Release v${newVersion}" --body "Automated release PR for version ${newVersion}" --base main`, 
      { stdio: 'inherit', cwd: packageRoot });
    console.log('Pull request created successfully');
  } catch (prError) {
    console.log('Could not create PR automatically. Please create a PR manually on GitHub.');
    console.log(`From branch: ${branchName} to main`);
  }
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