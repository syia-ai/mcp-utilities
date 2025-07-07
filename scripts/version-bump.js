import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

// Split version into parts
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Increment patch version
packageJson.version = `${major}.${minor}.${patch + 1}`;

// Write updated package.json
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped to ${packageJson.version}`); 