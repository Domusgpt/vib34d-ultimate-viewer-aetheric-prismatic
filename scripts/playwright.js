#!/usr/bin/env node

/**
 * Wrapper around the Playwright CLI that avoids relying on the non-executable
 * stub generated in node_modules/.bin when the workspace is extracted from
 * source control. By spawning the bundled CLI entry point directly we can run
 * "playwright" commands on platforms where the bin shim loses its executable
 * flag (such as when archives are unpacked on Windows before being committed).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const playwrightPackageDir = path.dirname(
  require.resolve('@playwright/test/package.json')
);
const cliPath = path.join(playwrightPackageDir, 'cli.js');

const args = process.argv.slice(2);

function loadConfigProjects() {
  const candidateNames = [
    'playwright.config.ts',
    'playwright.config.js',
    'playwright.config.mjs',
    'playwright.config.cjs'
  ];

  for (const fileName of candidateNames) {
    const fullPath = path.resolve(process.cwd(), fileName);
    if (fs.existsSync(fullPath)) {
      try {
        const configModule = require(fullPath);
        const config = configModule?.default ?? configModule;
        return Array.isArray(config?.projects) ? config.projects : [];
      } catch (error) {
        console.warn(
          `[playwright-wrapper] Unable to load ${fileName} to inspect projects: ${error.message}`
        );
        return [];
      }
    }
  }

  return [];
}

function collectRequestedProjects() {
  const result = new Set();
  const projectFlags = ['--project', '-p'];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    for (const flag of projectFlags) {
      if (arg === flag && args[i + 1]) {
        result.add(args[i + 1]);
      } else if (arg.startsWith(`${flag}=`)) {
        result.add(arg.slice(flag.length + 1));
      }
    }
  }

  return [...result];
}

function collectBrowserOverrides() {
  const result = new Set();
  const browserFlags = ['--browser'];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    for (const flag of browserFlags) {
      if (arg === flag && args[i + 1]) {
        result.add(args[i + 1]);
      } else if (arg.startsWith(`${flag}=`)) {
        result.add(arg.slice(flag.length + 1));
      }
    }
  }

  return [...result];
}

function discoverBrowsersToEnsure() {
  const browserNames = new Set();
  const overrides = collectBrowserOverrides();
  overrides.forEach(name => browserNames.add(name));

  if (!browserNames.size) {
    const projects = loadConfigProjects();
    const requestedProjects = collectRequestedProjects();

    const applicableProjects = requestedProjects.length
      ? projects.filter(project => requestedProjects.includes(project?.name))
      : projects;

    for (const project of applicableProjects) {
      const browserName = project?.use?.browserName || project?.name;
      if (browserName) {
        browserNames.add(browserName);
      }
    }
  }

  if (!browserNames.size) {
    browserNames.add('chromium');
  }

  return [...browserNames];
}

function hasBrowserInstall(browserName) {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(os.homedir(), '.cache', 'ms-playwright');

  if (!fs.existsSync(browsersPath)) {
    return false;
  }

  try {
    const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
    return entries.some(entry => entry.isDirectory() && entry.name.startsWith(`${browserName}-`));
  } catch (error) {
    console.warn(
      `[playwright-wrapper] Unable to inspect browser cache directory: ${error.message}`
    );
    return false;
  }
}

function ensureBrowsersInstalled() {
  if (!args.length) {
    return;
  }

  const skipCommands = new Set([
    'install',
    'show-report',
    'show-trace',
    'open-trace',
    'upload-trace'
  ]);

  if (skipCommands.has(args[0])) {
    return;
  }

  const browsers = discoverBrowsersToEnsure().filter(browser => !hasBrowserInstall(browser));

  if (!browsers.length) {
    return;
  }

  console.log(`Ensuring Playwright browsers are installed: ${browsers.join(', ')}`);
  const installResult = spawnSync(process.execPath, [cliPath, 'install', ...browsers], {
    stdio: 'inherit'
  });

  if (installResult.error) {
    console.error('Failed to install Playwright browsers:', installResult.error.message);
    process.exit(1);
  }

  if (installResult.status !== 0) {
    console.error(
      'Playwright browser installation failed. If you are operating in an offline or firewalled environment, '
      + 'pre-install the required browsers (npm run playwright:install) or set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 '
      + 'to bypass the automatic download.'
    );
    process.exit(installResult.status ?? 1);
  }
}

ensureBrowsersInstalled();

const result = spawnSync(process.execPath, [cliPath, ...args], {
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to execute Playwright CLI:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
