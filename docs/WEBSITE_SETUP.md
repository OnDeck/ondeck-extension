# Website changelog

The landing page in `OnDeck/ondeck-site` shows the latest version and recent
releases from `src/releases.json`. That file is updated automatically:

1. A release here sends a `changelog_update` repository dispatch with
   `{ version, date, tag, tone, items }` (see [RELEASE_PROCESS.md](RELEASE_PROCESS.md)).
2. `ondeck-site/.github/workflows/changelog-update.yml` writes the payload to
   a file and runs `scripts/add-release.mjs`, which validates it and adds or
   replaces that version at the top of `src/releases.json`.
3. The workflow builds the site to make sure it still compiles, then commits
   `chore(changelog): vX.Y.Z` and pushes. Your host redeploys from there.

The payload never touches a shell command line, so commit subjects with
quotes or `$(…)` can't run anything in the site's workflow.

To try the site side without cutting a release, run **Actions → Changelog
Update → Run workflow** in ondeck-site and paste a payload, or locally:

```bash
echo '{"version":"1.0.1","date":"2026-11-20","tag":"bugfix","tone":"green","items":["Fix: example"]}' > /tmp/payload.json
node scripts/add-release.mjs /tmp/payload.json
```
