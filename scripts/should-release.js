#!/usr/bin/env node
/**
 * Decide whether a push to main should cut a release.
 * Prints `release=true|false` for $GITHUB_OUTPUT; the reason goes to stderr.
 */

import { parseCommitsFromGit } from './parse-commits.js';

const RELEASABLE_TYPES = new Set(['feat', 'fix', 'perf']);

export function isReleasable(parsedCommits) {
  return parsedCommits.some((c) => c.isBreaking || RELEASABLE_TYPES.has(c.type));
}

async function main() {
  const { lastTag, parsedCommits } = await parseCommitsFromGit();

  // v1.0.0 is a deliberate launch decision, so the first release stays manual.
  if (!lastTag) {
    console.error('No release tag yet: run the Release workflow manually to cut v1.0.0.');
    console.log('release=false');
    return;
  }

  const release = isReleasable(parsedCommits);
  console.error(
    release
      ? `Releasable commits since ${lastTag}.`
      : `Only docs/chore/test/refactor commits since ${lastTag}: skipping release.`,
  );
  console.log(`release=${release}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Release check failed:', error);
    process.exit(1);
  });
}
