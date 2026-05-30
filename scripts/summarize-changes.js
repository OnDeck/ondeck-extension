#!/usr/bin/env node
/**
 * Generate concise human-readable summaries for changelog
 * Outputs JSON for website and markdown for extension
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCommitsFromGit } from './parse-commits.js';

const __dirname = new URL('.', import.meta.url).pathname;
const rootDir = join(__dirname, '..');

/**
 * Group commits by type
 * @param {object[]} parsedCommits - Parsed commits
 * @returns {object} Commits grouped by type
 */
function groupCommitsByType(parsedCommits) {
  const groups = {};

  parsedCommits.forEach((commit) => {
    const type = commit.type || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(commit);
  });

  return groups;
}

/**
 * Generate concise summary from commits
 * Combines related changes and limits to 2-4 bullet points
 * @param {object[]} parsedCommits - Parsed commits
 * @returns {string[]} Array of summary items
 */
function generateConciseSummary(parsedCommits) {
  const groups = groupCommitsByType(parsedCommits);
  const items = [];

  // Features
  if (groups.feat && groups.feat.length > 0) {
    const features = groups.feat;
    if (features.length === 1) {
      items.push(features[0].subject);
    } else {
      // Group by scope if available
      const scoped = {};
      const unscoped = [];

      features.forEach((commit) => {
        if (commit.scope) {
          if (!scoped[commit.scope]) {
            scoped[commit.scope] = [];
          }
          scoped[commit.scope].push(commit);
        } else {
          unscoped.push(commit);
        }
      });

      // Create summary for scoped features
      Object.entries(scoped).forEach(([scope, commits]) => {
        if (commits.length === 1) {
          items.push(`${scope}: ${commits[0].subject}`);
        } else {
          const subjects = commits.map((c) => c.subject.toLowerCase()).join(', ');
          items.push(`${scope} improvements including ${subjects}`);
        }
      });

      // Add unscoped features
      if (unscoped.length === 1) {
        items.push(unscoped[0].subject);
      } else if (unscoped.length > 1) {
        const subjects = unscoped.map((c) => c.subject).join(', ');
        items.push(`New features: ${subjects}`);
      }
    }
  }

  // Bug fixes
  if (groups.fix && groups.fix.length > 0) {
    const fixes = groups.fix;
    if (fixes.length === 1) {
      items.push(`Fix: ${fixes[0].subject}`);
    } else if (fixes.length <= 3) {
      const subjects = fixes.map((c) => c.subject).join(', ');
      items.push(`Bug fixes: ${subjects}`);
    } else {
      items.push(`${fixes.length} bug fixes and improvements`);
    }
  }

  // Performance improvements
  if (groups.perf && groups.perf.length > 0) {
    items.push('Performance improvements');
  }

  // If no items yet, add generic message
  if (items.length === 0) {
    items.push('Maintenance and improvements');
  }

  // Limit to 4 items max
  return items.slice(0, 4);
}

/**
 * Determine tone and tag based on version bump
 * @param {string} bumpType - Type of version bump
 * @param {boolean} isFirstRelease - Whether this is first release
 * @returns {object} Object with tag and tone
 */
function determineToneAndTag(bumpType, isFirstRelease) {
  if (isFirstRelease || bumpType === 'first') {
    return { tag: 'launch', tone: 'green' };
  }

  switch (bumpType) {
    case 'major':
      return { tag: 'breaking', tone: 'red' };
    case 'minor':
      return { tag: 'feature', tone: 'blue' };
    case 'patch':
      return { tag: 'bugfix', tone: 'green' };
    default:
      return { tag: 'update', tone: 'purple' };
  }
}

/**
 * Main function
 */
async function main() {
  const { lastTag, parsedCommits } = await parseCommitsFromGit();

  // Get version from package.json
  const pkgPath = join(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  // Determine if first release
  const isFirstRelease = !lastTag;

  // Determine bump type (simplified - should match version-bump.js logic)
  const hasBreaking = parsedCommits.some((c) => c.isBreaking);
  const hasFeat = parsedCommits.some((c) => c.type === 'feat');
  const bumpType = isFirstRelease
    ? 'first'
    : hasBreaking
    ? 'major'
    : hasFeat
    ? 'minor'
    : 'patch';

  // Generate summary items
  const items = generateConciseSummary(parsedCommits);

  // Determine tone and tag
  const { tag, tone } = determineToneAndTag(bumpType, isFirstRelease);

  // Get current date
  const date = new Date().toISOString().split('T')[0];

  // Create website payload
  const websitePayload = {
    version,
    date,
    tag,
    tone,
    items,
  };

  console.log('📝 Changelog Summary:');
  console.log(JSON.stringify(websitePayload, null, 2));

  // Output for GitHub Actions
  console.log(`\n::set-output name=changelog_json::${JSON.stringify(websitePayload)}`);

  return websitePayload;
}

main().catch((error) => {
  console.error('❌ Summary generation failed:', error);
  process.exit(1);
});
