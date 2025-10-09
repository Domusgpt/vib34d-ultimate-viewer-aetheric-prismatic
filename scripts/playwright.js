#!/usr/bin/env node

/**
 * Wrapper around the Playwright CLI that avoids relying on the non-executable
 * stub generated in node_modules/.bin when the workspace is extracted from
 * source control. By spawning the bundled CLI entry point directly we can run
 * "playwright" commands on platforms where the bin shim loses its executable
 * flag (such as when archives are unpacked on Windows before being committed).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const playwrightPackageDir = path.dirname(
  require.resolve('@playwright/test/package.json')
);
const cliPath = path.join(playwrightPackageDir, 'cli.js');

const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to execute Playwright CLI:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
