# Release Process

This document describes the automated changelog and release process for the OnDeck browser extension.

## Overview

Releases are cut manually by running the `Release` workflow against `main`. It then:

1. **Version Bump**: Calculates new version based on conventional commits (semver)
2. **Changelog Generation**: Creates/updates `CHANGELOG.md` with grouped changes
3. **Git Tagging**: Creates a version tag (e.g., `v1.0.0`)
4. **Website Update**: Dispatches changelog update to the ondeck-site repository

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature → **MINOR** version bump (1.0.0 → 1.1.0)
- `fix`: Bug fix → **PATCH** version bump (1.0.0 → 1.0.1)
- `docs`: Documentation changes → PATCH bump
- `style`: Code style changes → PATCH bump
- `refactor`: Code refactoring → PATCH bump
- `perf`: Performance improvements → PATCH bump
- `test`: Test changes → PATCH bump
- `chore`: Build/tooling changes → PATCH bump

### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer → **MAJOR** version bump (1.0.0 → 2.0.0)

```
feat(api): redesign authentication system

BREAKING CHANGE: The authentication API has been completely redesigned.
Old tokens are no longer valid.
```

## Release Workflow

### 1. Get `main` Ready

Merge everything that should ship into `main` and make sure CI is green. Merging does not release anything.

### 2. Run the Release Workflow

From the Actions tab (**Release** → **Run workflow**), or:

```bash
gh workflow run release.yml
```

It always releases `main`, whichever branch the run is started from:

1. Analyzes commits since last tag (fails if there are none)
3. Determines version bump (major/minor/patch)
4. Updates `package.json` and `public/manifest.json`
5. Generates `CHANGELOG.md`
6. Commits changes with `[skip ci]`
7. Creates git tag
8. Pushes to main

### 3. Website Update

The final step of `release.yml`:

1. Dispatches the changelog summary (computed before tagging) to the `ondeck-site` repository
2. Website's `changelog-update.yml` workflow receives event
3. Updates `src/components/landing/Changelog.tsx`
4. Commits and pushes to website repo

## Version Numbering

### First Release

- Version: `1.0.0`
- Tag: `launch`
- Tone: `green`

### Subsequent Releases

| Commits | Version | Tag | Tone |
|---------|---------|-----|------|
| `feat:` only | 1.0.0 → 1.1.0 | feature | blue |
| `fix:` only | 1.0.0 → 1.0.1 | bugfix | green |
| Mixed `feat:` + `fix:` | 1.0.0 → 1.1.0 | feature | blue |
| `BREAKING CHANGE:` | 1.0.0 → 2.0.0 | breaking | red |

## Rollback Procedure

If a release needs to be rolled back:

### Extension Repository

```bash
# 1. Revert the release commit
git revert <commit-sha>

# 2. Delete the tag
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0

# 3. Push the revert
git push origin main
```

### Website Repository

```bash
# In ondeck-site repository
cd ../ondeck-site

# 1. Revert the changelog update
git revert <commit-sha>

# 2. Push the revert
git push origin main
```

## Manual Intervention

### If Website Update Fails

If the website dispatch fails, you can manually update it:

1. Go to the ondeck-site repository
2. Manually trigger the `changelog-update.yml` workflow with the payload

Or update `src/components/landing/Changelog.tsx` manually:

```typescript
const entries: ChangelogEntry[] = [
  {
    v: '1.1.0',
    d: '2026-05-30',
    tag: 'feature',
    tone: 'blue',
    items: [
      'Your change summary here',
      'Another change here'
    ]
  },
  // ... existing entries
];
```

## Required Setup

### Extension Repository

1. Install dependencies:
   ```bash
   npm install --save-dev conventional-changelog-cli conventional-commits-parser semver
   ```

2. No additional secrets needed (uses `GITHUB_TOKEN`)

### Website Repository

1. Install dependencies:
   ```bash
   npm install --save-dev @babel/parser @babel/generator @babel/types
   ```

2. Create `CHANGELOG_BOT_TOKEN` secret in extension repository:
   - Generate a Personal Access Token with `repo` scope
   - Add as repository secret named `CHANGELOG_BOT_TOKEN`

## Troubleshooting

### Run Workflow button is missing

- `workflow_dispatch` only appears once `release.yml` is on `main`
- Check GitHub Actions are enabled

### Release fails with "nothing to release"

- No commits landed on `main` since the last tag; merge something first

### Version bump is wrong

- Review commit messages for conventional commit format
- Check for `BREAKING CHANGE:` in commit footers
- Run `node scripts/version-bump.js` locally to debug

### Changelog is empty

- Ensure commits follow conventional commit format
- Check `git log` for commit messages
- Run `node scripts/summarize-changes.js` locally

### Website update fails

- Check `CHANGELOG_BOT_TOKEN` secret is set
- Verify token has `repo` scope
- Check ondeck-site repository has `changelog-update.yml` workflow

## Scripts

### `scripts/parse-commits.js`

Shared utility to parse conventional commits from git history.

```bash
node scripts/parse-commits.js
```

### `scripts/version-bump.js`

Calculate version bump and update package.json and manifest.json.

```bash
node scripts/version-bump.js
```

### `scripts/summarize-changes.js`

Generate human-readable changelog summaries.

```bash
node scripts/summarize-changes.js
```

## Best Practices

1. **Write clear commit messages**: Follow conventional commit format
2. **Test before releasing**: Ensure CI is green on `main` before running the workflow
3. **Review changelog**: Check generated changelog makes sense
4. **Small, frequent releases**: Better than large, infrequent ones
5. **Document breaking changes**: Clearly explain what changed and how to migrate

## Future Enhancements

- [ ] Automated website deployment
- [ ] Chrome Web Store publishing automation
- [ ] GitHub Releases creation
- [ ] Changelog preview in PRs
- [ ] AI-powered summaries
