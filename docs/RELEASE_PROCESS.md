# Release Process

Releases are automatic once the first one exists. Every merge to `main`
runs the **Release** workflow, which:

1. Checks the commits since the last tag. It only releases when there's at
   least one `feat`, `fix`, `perf` or breaking commit; docs, chore, test,
   style and refactor-only merges are skipped.
2. Bumps the version in `package.json` and `public/manifest.json` (semver,
   from the commit types).
3. Regenerates `CHANGELOG.md`.
4. Commits `chore(release): vX.Y.Z [skip ci]`, tags `vX.Y.Z` and pushes both.
5. Sends a short summary to the site (`OnDeck/ondeck-site`), which adds it to
   the landing page's changelog and version badge.

## First release

The first release (v1.0.0) is never cut by a merge. When you're ready to call
it 1.0.0, open **Actions → Release → Run workflow**, optionally type launch
notes for the site (one item per line), and run it. From then on, merges
release on their own.

A manual run always releases, whatever the commit types, so it's also how to
force a release.

## Conventional commits

PR titles and commits follow [Conventional Commits](https://www.conventionalcommits.org/)
(`validate-pr.yml` enforces the PR title).

| Commits since the last tag | Release | Site tag |
| --- | --- | --- |
| Any `BREAKING CHANGE:` footer or `type!:` | 1.0.0 → 2.0.0 | major (red) |
| At least one `feat` | 1.0.0 → 1.1.0 | minor (blue) |
| `fix` or `perf`, no `feat` | 1.0.0 → 1.0.1 | patch (green) |
| Only `docs`, `chore`, `test`, `style`, `refactor` | none | none |

The site entry lists up to four items summarised from the commit subjects, so
write subjects as you'd want users to read them.

## Site update

The release job sends a `changelog_update` repository dispatch to
`OnDeck/ondeck-site` with `{ version, date, tag, tone, items }`. The site's
`changelog-update.yml` adds it to `src/releases.json` and pushes, and the
landing page reads its changelog and version badge from that file.

This needs a `CHANGELOG_BOT_TOKEN` secret in this repo. Without it, releases
still happen and the job summary says the site was skipped.

To create it:

1. Go to github.com → Settings → Developer settings → **Fine-grained tokens**
   → Generate new token.
2. Resource owner: **OnDeck**. Repository access: only **ondeck-site**.
3. Repository permissions: **Contents: Read and write** (needed to send a
   repository dispatch). Nothing else.
4. In this repo: Settings → Secrets and variables → Actions → New repository
   secret, named `CHANGELOG_BOT_TOKEN`.

If the org requires approval for fine-grained tokens, approve it under the
org's Settings → Personal access tokens.

## Rollback

```bash
git revert <release-commit-sha>        # in this repo
git push origin :refs/tags/vX.Y.Z      # delete the tag
git push origin main
```

On the site, revert the `chore(changelog): vX.Y.Z` commit.

## Troubleshooting

- **A merge didn't release**: the run's log says why. Either there's no tag
  yet (cut v1.0.0 manually) or the merge only had non-releasable commits.
- **Push rejected**: another merge landed during the run. The queued run for
  that merge releases both.
- **Wrong version**: check commit types and `BREAKING CHANGE:` footers; run
  `node scripts/should-release.js` and `node scripts/version-bump.js` locally.
- **Site not updated**: check the `CHANGELOG_BOT_TOKEN` secret and the
  **Changelog Update** run in ondeck-site.

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/parse-commits.js` | Parses conventional commits since the last tag |
| `scripts/should-release.js` | Prints `release=true/false` for a push to main |
| `scripts/version-bump.js` | Bumps `package.json` and the manifest |
| `scripts/summarize-changes.js` | Builds the site payload; `RELEASE_NOTES` overrides the items |
