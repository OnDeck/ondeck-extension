#!/usr/bin/env node
/**
 * Shared utility to parse conventional commits since last release
 */

import { execSync } from 'child_process';
import conventionalCommitsParser from 'conventional-commits-parser';

/**
 * Get the last git tag (version tag)
 * @returns {string|null} Last tag or null if no tags exist
 */
export function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Get commit messages since last tag (or all commits if no tag)
 * @param {string|null} since - Tag to start from, or null for all commits
 * @returns {string[]} Array of commit messages
 */
export function getCommitsSince(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  try {
    const log = execSync(`git log ${range} --format=%B%n--COMMIT--`, { encoding: 'utf8' });
    return log
      .split('--COMMIT--')
      .map((msg) => msg.trim())
      .filter((msg) => msg.length > 0);
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return [];
  }
}

/**
 * Parse conventional commits
 * @param {string[]} commitMessages - Raw commit messages
 * @returns {object[]} Parsed commit objects
 */
export function parseConventionalCommits(commitMessages) {
  const parser = conventionalCommitsParser.sync;

  return commitMessages.map((message) => {
    const parsed = parser(message, {
      headerPattern: /^(\w+)(?:\(([^)]*)\))?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
      revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w+)/i,
      revertCorrespondence: ['header', 'hash'],
    });

    return {
      type: parsed.type || 'other',
      scope: parsed.scope || null,
      subject: parsed.subject || message.split('\n')[0],
      body: parsed.body || '',
      footer: parsed.footer || '',
      notes: parsed.notes || [],
      isBreaking: parsed.notes.some((note) => note.title === 'BREAKING CHANGE'),
      raw: message,
    };
  });
}

/**
 * Main function to get and parse commits
 * @returns {object} Object with lastTag, commits, and parsedCommits
 */
export async function parseCommitsFromGit() {
  const lastTag = getLastTag();
  const commitMessages = getCommitsSince(lastTag);
  const parsedCommits = parseConventionalCommits(commitMessages);

  return {
    lastTag,
    commits: commitMessages,
    parsedCommits,
  };
}

// If run directly, output commits as JSON
if (import.meta.url === `file://${process.argv[1]}`) {
  parseCommitsFromGit().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}
