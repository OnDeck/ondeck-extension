#!/usr/bin/env node
/**
 * Calculate version bump based on conventional commits
 * Updates package.json and manifest.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import semver from 'semver';
import { parseCommitsFromGit } from './parse-commits.js';

const __dirname = new URL('.', import.meta.url).pathname;
const rootDir = join(__dirname, '..');

/**
 * Determine version bump type from parsed commits
 * @param {object[]} parsedCommits - Parsed conventional commits
 * @param {boolean} isFirstRelease - Whether this is the first release
 * @returns {string} 'major', 'minor', 'patch', or 'first'
 */
function determineBumpType(parsedCommits, isFirstRelease) {
  if (isFirstRelease) {
    return 'first';
  }

  const hasBreaking = parsedCommits.some((commit) => commit.isBreaking);
  const hasFeat = parsedCommits.some((commit) => commit.type === 'feat');
  const hasFix = parsedCommits.some((commit) => commit.type === 'fix');

  if (hasBreaking) {
    return 'major';
  }
  if (hasFeat) {
    return 'minor';
  }
  if (hasFix) {
    return 'patch';
  }

  // Default to patch for any other commits
  return 'patch';
}

/**
 * Calculate new version
 * @param {string|null} lastTag - Last version tag
 * @param {string} currentVersion - Current version from package.json
 * @param {string} bumpType - Type of bump
 * @returns {string} New version
 */
function calculateNewVersion(lastTag, currentVersion, bumpType) {
  if (bumpType === 'first') {
    return '1.0.0';
  }

  const baseVersion = lastTag ? lastTag.replace(/^v/, '') : currentVersion;

  if (!semver.valid(baseVersion)) {
    console.error(`Invalid semver version: ${baseVersion}`);
    return '1.0.0';
  }

  return semver.inc(baseVersion, bumpType);
}

/**
 * Update package.json version
 * @param {string} newVersion - New version to set
 */
function updatePackageJson(newVersion) {
  const pkgPath = join(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated package.json to ${newVersion}`);
}

/**
 * Update manifest.json version
 * @param {string} newVersion - New version to set
 */
function updateManifestJson(newVersion) {
  const manifestPath = join(rootDir, 'public/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✅ Updated manifest.json to ${newVersion}`);
}

/**
 * Main function
 */
async function main() {
  const { lastTag, parsedCommits } = await parseCommitsFromGit();

  const pkgPath = join(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;

  const isFirstRelease = !lastTag;
  const bumpType = determineBumpType(parsedCommits, isFirstRelease);
  const newVersion = calculateNewVersion(lastTag, currentVersion, bumpType);

  console.log('📊 Version Bump Analysis:');
  console.log(`  Last tag: ${lastTag || 'none'}`);
  console.log(`  Current version: ${currentVersion}`);
  console.log(`  Bump type: ${bumpType}`);
  console.log(`  New version: ${newVersion}`);
  console.log(`  Commits analyzed: ${parsedCommits.length}`);

  // Update both files
  updatePackageJson(newVersion);
  updateManifestJson(newVersion);

  // Output for GitHub Actions
  console.log(`\n::set-output name=version::${newVersion}`);
  console.log(`::set-output name=bump_type::${bumpType}`);
  console.log(`::set-output name=is_first_release::${isFirstRelease}`);

  return newVersion;
}

main().catch((error) => {
  console.error('❌ Version bump failed:', error);
  process.exit(1);
});
