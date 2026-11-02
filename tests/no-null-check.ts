/**
 * Static Analysis Script: Enforces User Rule "DON'T USE TYPE NULL".
 * Scans all TypeScript files (*.ts, *.tsx) to guarantee zero occurrences of `type null`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

const DIRS_TO_SCAN = ['src', 'server', 'prisma', 'tests'];
let violationCount = 0;

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git' && entry.name !== 'client' && entry.name !== 'dist-server' && entry.name !== 'dist-electron') {
        scanDir(fullPath);
      }
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath: string) {
  // Exclude this checker script itself from checking its own search patterns
  if (filePath.endsWith('no-null-check.ts')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for type null patterns: `: null`, `| null`, `null |`, `<null>`, `as null`, `null as`
    const typeNullRegex = /(:\s*null|\bnull\s*\||\|\s*null\b|<null>|\bas\s+null\b|\bnull\s+as\b)/;
    if (typeNullRegex.test(line)) {
      console.error(`❌ VIOLATION [No Type Null Rule] in ${path.relative(rootDir, filePath)}:${index + 1}`);
      console.error(`   Line: ${line.trim()}`);
      violationCount++;
    }
  });
}

console.log('--- SCANNING CODEBASE FOR STRICT "NO TYPE NULL" COMPLIANCE ---');
for (const d of DIRS_TO_SCAN) {
  const p = path.join(rootDir, d);
  if (fs.existsSync(p)) {
    scanDir(p);
  }
}

if (violationCount === 0) {
  console.log('✅ PERFECT! ZERO occurrences of "type null" found across all TypeScript files.');
  process.exit(0);
} else {
  console.error(`❌ Found ${violationCount} violation(s) of "don't use type null".`);
  process.exit(1);
}

