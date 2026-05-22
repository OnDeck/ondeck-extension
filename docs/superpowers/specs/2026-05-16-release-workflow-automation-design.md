# Release Workflow Automation Design

## Context

The project needs a structured release workflow to manage changes flowing from feature development through release branches to main. Currently:

- Development happens on `release/1` (features merge here)
- `release/1` periodically merges to `main` via PR when ready
- After merging to main, a new `release/2` branch is created for the next cycle
- No automated changelog generation exists
- No enforcement of conventional commit format
- No structured issue templates

This design establishes automation and enforcement to:
- Require all merges to `main` happen via PR
- Validate that PR titles and commits follow conventional commit format
- Auto-generate CHANGELOG.md from conventional commits
- Provide structured issue templates for bugs, features, and chores

## Goals

1. **Enforce PR workflow** - All changes to main must go through pull requests
2. **Validate commit format** - PR titles and all commits must follow conventional commit format
3. **Automate changelog** - Generate CHANGELOG.md from commits when release/X merges to main
4. **Structured issues** - Provide templates for bug reports, feature requests, and chores
5. **Manual versioning** - Developer manually updates package.json version in main before publishing

## Architecture

### Workflows

**Two new GitHub Actions workflows:**

1. **`validate-pr.yml`** - Runs on pull requests targeting `main`
   - Validates PR title format
   - Validates all commit messages in the PR
   - Fails CI if format violations found
   - Required check before merge allowed

2. **`changelog.yml`** - Runs after merge to `main`
   - Parses commits since last release using conventional-changelog-cli
   - Updates CHANGELOG.md in Keep a Changelog format
   - Commits and pushes back to main with `[skip ci]` flag

**Existing workflow:**
- Keep `ci.yml` unchanged - continues to run lint, typecheck, test, build

### Issue Templates

**Three issue templates** (copied from mandir-band-app):

1. **`bug.yml`** - Bug reports with fields for issue description, reproduction steps, additional context
2. **`feature.yml`** - Feature requests with fields for feature description, rationale, additional context
3. **`chore.yml`** - Internal tasks with fields for task description, additional context

### Branch Protection

**GitHub repository settings** (configured manually, not in code):
- Require pull requests before merging to `main`
- Require status checks to pass: `validate-pr`, `ci`
- Require branches to be up to date before merging
- Do not allow bypassing settings

## Detailed Design

### 1. PR Validation Workflow

**File:** `.github/workflows/validate-pr.yml`

**Trigger:**
```yaml
on:
  pull_request:
    branches: [main]
```

**Steps:**

1. Checkout repository
2. Validate PR title matches conventional commit pattern:
   - Pattern: `^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .+$`
   - Valid examples:
     - `feat: add changelog workflow`
     - `fix(ci): update node version`
     - `docs: update README`
   - Invalid examples:
     - `Add changelog workflow` (no type)
     - `feature: add workflow` (wrong type name)

3. Validate all commits in PR:
   - Fetch all commits in the PR
   - Check each commit message against same pattern
   - Collect all violations

4. Report results:
   - If all valid: workflow passes
   - If any invalid: fail with detailed message listing violations and examples

**Error messages:**
- Clear format with examples of correct syntax
- List specific commits that failed validation
- Show expected pattern

### 2. Changelog Generation Workflow

**File:** `.github/workflows/changelog.yml`

**Trigger:**
```yaml
on:
  push:
    branches: [main]
```

**Steps:**

1. **Checkout with full history:**
   ```yaml
   - uses: actions/checkout@v4
     with:
       fetch-depth: 0  # need full history for commit parsing
   ```

2. **Setup Node.js:**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: 20
   ```

3. **Install conventional-changelog-cli:**
   ```bash
   npm install -g conventional-changelog-cli
   ```

4. **Generate/update CHANGELOG.md:**
   ```bash
   conventional-changelog -p angular -i CHANGELOG.md -s
   ```
   - `-p angular` uses Angular commit convention
   - `-i CHANGELOG.md` updates existing file (or creates if missing)
   - `-s` reads from last tag/entry, prepends new section

5. **Commit and push:**
   ```bash
   git config user.name "github-actions[bot]"
   git config user.email "github-actions[bot]@users.noreply.github.com"
   git add CHANGELOG.md
   git commit -m "chore: update CHANGELOG.md [skip ci]"
   git push
   ```
   - `[skip ci]` prevents infinite loop (changelog commit won't trigger this workflow again)

**Conventional commit types recognized:**
- `feat:` → **Features** section
- `fix:` → **Bug Fixes** section
- `perf:` → **Performance Improvements** section
- `docs:`, `chore:`, `style:`, `refactor:`, `test:` → Not included in changelog by default

### 3. CHANGELOG.md Format

**Structure:** Follow [Keep a Changelog](https://keepachangelog.com/) format.

**Example:**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Features
- add changelog workflow (#123)
- implement dark mode UI (#119)

### Bug Fixes
- fix CI eslint version mismatch (#121)
- resolve navigation state bug (#118)

### Documentation
- add DEVELOPMENT.md with setup guide (#120)

## [0.1.0] - 2026-05-15

### Features
- initial release with notification management
```

**Section ordering:**
1. **[Unreleased]** at top - changes on main not yet versioned
2. Versioned releases below (newest first)
3. Within each version: Features, Bug Fixes, Performance, Documentation

**Initial creation:**
- On first workflow run, conventional-changelog creates CHANGELOG.md with header
- Generates from entire git history (will be comprehensive initially)

**Version lifecycle:**
- Commits accumulate in `[Unreleased]` section
- Developer manually bumps version in package.json when ready to publish
- Developer manually renames `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`
- Next merge to main creates new `[Unreleased]` section

### 4. Issue Templates

**Location:** `.github/ISSUE_TEMPLATE/`

**Files to create:**

1. **`bug.yml`**
   ```yaml
   name: 🐞 Bug
   description: Report a bug or unexpected behavior.
   title: "[Bug] "
   labels: ["bug", "dev"]
   body:
     - type: textarea
       id: description
       attributes:
         label: What's the issue?
         placeholder: e.g. The page doesnt show the information properly
       validations:
         required: true
     
     - type: textarea
       id: steps
       attributes:
         label: How to reproduce (if applicable)?
         placeholder: Steps, commands, or logs to reproduce the issue.
       validations:
         required: false
     
     - type: textarea
       id: notes
       attributes:
         label: Notes and Additional context (optional)
         placeholder: Related issues, diagrams, or discussions.
       validations:
         required: false
   ```

2. **`feature.yml`**
   ```yaml
   name: 🚀 Feature
   description: Request a new feature or enhancement.
   title: "[Feature] "
   labels: ["feature", "dev"]
   body:
     - type: textarea
       id: summary
       attributes:
         label: What is the feature?
         placeholder: e.g. Add Dark/Light mode
       validations:
         required: true
     
     - type: textarea
       id: rationale
       attributes:
         label: Why is it useful?
         placeholder: Helps simplify onboarding new devices.
       validations:
         required: false
     
     - type: textarea
       id: notes
       attributes:
         label: Notes and Additional context (optional)
         placeholder: Related issues, diagrams, or discussions.
       validations:
         required: false
   ```

3. **`chore.yml`**
   ```yaml
   name: 🧹 Chore
   description: Track infra cleanup, refactoring, or internal tasks.
   title: "[Chore] "
   labels: ["chore", "dev"]
   body:
     - type: textarea
       id: task
       attributes:
         label: What needs doing?
         placeholder: e.g. Remove unused peers from config files
       validations:
         required: true
     
     - type: textarea
       id: notes
       attributes:
         label: Notes and Additional context (optional)
         placeholder: Related issues, diagrams, or discussions.
       validations:
         required: false
   ```

**Benefits:**
- Consistent issue structure
- Auto-applied labels for filtering
- Guided information collection
- Title prefixes for quick scanning

## Error Handling

### Validation Failures

**Invalid PR title:**
- Workflow fails with exit code 1
- Error message shows expected format with examples
- GitHub check marked as failed, merge blocked

**Invalid commit messages:**
- List all failing commits with their SHAs
- Show expected pattern and examples
- Suggest using `git commit --amend` or interactive rebase

**Empty PR:**
- Skip validation gracefully
- Mark check as passed (shouldn't happen but handle safely)

### Changelog Generation Failures

**No conventional commits:**
- conventional-changelog generates empty sections
- CHANGELOG.md still updated with structure
- Developer sees no new entries, prompting investigation

**CHANGELOG.md doesn't exist:**
- Tool creates it automatically with proper header
- Includes all commits from git history
- May be very long initially

**Push fails:**
- Workflow fails visibly in GitHub Actions
- Check GITHUB_TOKEN permissions
- Requires `contents: write` permission in workflow

**Malformed existing CHANGELOG:**
- conventional-changelog attempts to parse
- If fails, generates from scratch
- Previous manual entries may be lost (rare edge case)

### Bot Commit Loops

**Prevention:**
- Bot commits include `[skip ci]` in message
- GitHub Actions recognizes this and skips workflow triggers
- No infinite loop possible

**Pattern:**
```
chore: update CHANGELOG.md [skip ci]
```

## Files to Create/Modify

### New Files

**Workflows:**
- `.github/workflows/validate-pr.yml`
- `.github/workflows/changelog.yml`

**Issue Templates:**
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/chore.yml`

**Documentation:**
- `CHANGELOG.md` (created automatically on first workflow run)

### Unchanged Files

- `.github/workflows/ci.yml` (keep existing CI checks)
- `package.json` (version updated manually by developer)

### Manual Configuration

**GitHub Repository Settings:**
1. Navigate to Settings → Branches
2. Add branch protection rule for `main`:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Select required checks: `validate-pr`, `ci`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
   - ❌ Allow force pushes (keep disabled)
   - ❌ Allow deletions (keep disabled)

## Verification Plan

### Test PR Validation

1. Create test branch from `release/1`
2. Add commit with invalid format: `git commit -m "update readme"`
3. Push and open PR to `main`
4. **Expected:** `validate-pr` check fails with error message
5. Fix commit: `git commit --amend -m "docs: update readme"`
6. Force push: `git push -f`
7. **Expected:** `validate-pr` check passes

### Test PR Title Validation

1. Open PR with title "Update changelog workflow"
2. **Expected:** `validate-pr` check fails
3. Edit PR title to "feat: add changelog workflow"
4. **Expected:** `validate-pr` check passes

### Test Changelog Generation

1. Merge a PR to `main` containing conventional commits
2. **Expected:** `changelog` workflow triggers automatically
3. **Expected:** CHANGELOG.md created/updated with new section
4. **Expected:** New section contains commits grouped by type
5. **Expected:** Bot commit pushed with message `chore: update CHANGELOG.md [skip ci]`
6. **Expected:** Bot commit does NOT trigger `changelog` workflow again

### Test Issue Templates

1. Navigate to repository → Issues → New issue
2. **Expected:** Three template options displayed (Bug, Feature, Chore)
3. Select "🐞 Bug" template
4. **Expected:** Form loads with correct fields
5. Fill and submit
6. **Expected:** Issue created with `bug` and `dev` labels, title prefix `[Bug]`
7. Repeat for Feature and Chore templates

### Test Branch Protection

1. Attempt to push directly to `main`: `git push origin main`
2. **Expected:** Push rejected by GitHub
3. Attempt to merge PR with failing checks
4. **Expected:** Merge button disabled, message shows required checks

## Implementation Notes

### Conventional Commit Format

**Pattern:** `type(scope): subject`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring (no feature or bug fix)
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, configs)

**Scope:** Optional, describes section of codebase (e.g., `ci`, `api`, `ui`)

**Examples:**
- `feat: add dark mode toggle`
- `fix(ci): resolve eslint version conflict`
- `docs: update installation instructions`
- `refactor(api): simplify error handling`

### Tool Choice

**conventional-changelog-cli** chosen over alternatives:
- **vs release-please:** Lighter weight, we handle versioning manually
- **vs semantic-release:** Too opinionated, automates versioning we want manual control over
- **vs custom script:** Industry standard tool, well maintained, familiar format

### First-Time Changelog

**Initial generation will be comprehensive:**
- Parses entire git history
- Groups all past commits by type
- Likely 50+ entries for this project
- Consider manually editing to consolidate if too verbose

**Recommendation:**
- Let it generate fully
- Review and manually consolidate pre-workflow commits into single "Initial release" section
- Future changelogs will be incremental and clean

## Trade-offs and Considerations

### Automated vs Manual Version Bumping

**Chosen:** Manual version bumping

**Rationale:**
- Developer retains control over release timing
- Can batch multiple PRs into single version bump
- Avoids version churn from every merge
- Simpler workflow, fewer moving parts

**Constraint:**
- Developer must remember to update package.json
- No enforcement that version matches CHANGELOG

### Bot Commits to Main

**Concern:** Workflows writing back to main post-merge

**Mitigation:**
- Bot commits clearly labeled: `chore: update CHANGELOG.md [skip ci]`
- Won't trigger other workflows due to `[skip ci]`
- Minimal risk - only touches CHANGELOG.md
- Alternative would be requiring manual changelog updates, which defeats automation goal

**Accepted tradeoff:** Small amount of post-merge activity for substantial automation benefit

### PR Validation Strictness

**Chosen:** Strict validation of all commits and PR title

**Rationale:**
- Ensures consistent git history
- Makes changelog generation reliable
- Enforces best practices across team

**Consideration:**
- May slow down urgent hotfixes
- Developers need to learn conventional commit format
- Can use `git commit --amend` or interactive rebase to fix mistakes

**Mitigation:**
- Clear error messages with examples
- Can temporarily disable check in emergency (requires admin)

## Future Enhancements

**Not in this design, but could add later:**

1. **Automated GitHub Releases**
   - When version is manually bumped, create GitHub Release
   - Include changelog section for that version

2. **Version bump automation**
   - Parse conventional commits to determine semver bump
   - Auto-update package.json

3. **Breaking change detection**
   - Look for `BREAKING CHANGE:` in commit bodies
   - Highlight in changelog, suggest major version bump

4. **Changelog preview**
   - Post comment on PR showing what will be added to changelog
   - Helps reviewer understand impact

5. **Commit message linting**
   - Pre-commit hook via Husky
   - Catch format violations before push

## Critical Files

**Workflows:**
- `.github/workflows/validate-pr.yml` - PR validation logic
- `.github/workflows/changelog.yml` - Changelog generation logic

**Templates:**
- `.github/ISSUE_TEMPLATE/bug.yml` - Bug report form
- `.github/ISSUE_TEMPLATE/feature.yml` - Feature request form
- `.github/ISSUE_TEMPLATE/chore.yml` - Chore task form

**Generated:**
- `CHANGELOG.md` - Auto-generated changelog (created by workflow)

**Reference:**
- `/Users/dillan/Programming/Mandir/mandir-band-app/.github/ISSUE_TEMPLATE/` - Source templates
