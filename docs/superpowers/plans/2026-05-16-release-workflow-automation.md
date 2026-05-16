# Release Workflow Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate release workflow with PR validation, changelog generation, and structured issue templates.

**Architecture:** Two GitHub Actions workflows (PR validation + changelog generation), three issue templates, branch protection via GitHub settings. Conventional commits drive everything.

**Tech Stack:** GitHub Actions, conventional-changelog-cli, Keep a Changelog format, YAML issue templates

---

## File Structure

**New workflows:**
- `.github/workflows/validate-pr.yml` - Validates PR title and commit messages against conventional format
- `.github/workflows/changelog.yml` - Auto-generates CHANGELOG.md from commits after merge to main

**New issue templates:**
- `.github/ISSUE_TEMPLATE/bug.yml` - Structured bug report form
- `.github/ISSUE_TEMPLATE/feature.yml` - Structured feature request form
- `.github/ISSUE_TEMPLATE/chore.yml` - Structured chore/task form

**New documentation:**
- `CHANGELOG.md` - Changelog file (scaffold, then auto-generated)
- `docs/BRANCH_PROTECTION.md` - Instructions for setting up branch protection

---

### Task 1: Create PR Validation Workflow

**Files:**
- Create: `.github/workflows/validate-pr.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Validate PR

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Validate PR Title and Commits
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Validate PR title
        run: |
          PR_TITLE="${{ github.event.pull_request.title }}"
          PATTERN="^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .+"
          
          if [[ ! "$PR_TITLE" =~ $PATTERN ]]; then
            echo "❌ PR title does not follow conventional commit format"
            echo ""
            echo "Expected format: type(scope): subject"
            echo ""
            echo "Valid types: feat, fix, docs, style, refactor, perf, test, chore"
            echo "Scope is optional: feat: add feature OR feat(api): add feature"
            echo ""
            echo "Examples:"
            echo "  ✅ feat: add changelog workflow"
            echo "  ✅ fix(ci): update node version"
            echo "  ✅ docs: update README"
            echo "  ❌ Add changelog workflow (missing type)"
            echo "  ❌ feature: add workflow (wrong type name)"
            echo ""
            echo "Your PR title: $PR_TITLE"
            exit 1
          fi
          
          echo "✅ PR title is valid: $PR_TITLE"

      - name: Validate commit messages
        run: |
          BASE_SHA="${{ github.event.pull_request.base.sha }}"
          HEAD_SHA="${{ github.event.pull_request.head.sha }}"
          PATTERN="^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?: .+"
          
          INVALID_COMMITS=""
          
          while IFS= read -r commit; do
            SHA=$(echo "$commit" | cut -d' ' -f1)
            MESSAGE=$(echo "$commit" | cut -d' ' -f2-)
            
            if [[ ! "$MESSAGE" =~ $PATTERN ]]; then
              INVALID_COMMITS="$INVALID_COMMITS\n  - $SHA: $MESSAGE"
            fi
          done < <(git log --format="%H %s" "$BASE_SHA".."$HEAD_SHA")
          
          if [[ -n "$INVALID_COMMITS" ]]; then
            echo "❌ Found commits that don't follow conventional commit format:"
            echo -e "$INVALID_COMMITS"
            echo ""
            echo "Expected format: type(scope): subject"
            echo ""
            echo "Valid types: feat, fix, docs, style, refactor, perf, test, chore"
            echo ""
            echo "To fix, use interactive rebase:"
            echo "  git rebase -i $BASE_SHA"
            echo "Then mark commits as 'reword' and update their messages"
            echo ""
            echo "Or amend the last commit:"
            echo "  git commit --amend -m 'feat: your message'"
            exit 1
          fi
          
          echo "✅ All commit messages are valid"
```

- [ ] **Step 2: Verify file was created**

Run: `cat .github/workflows/validate-pr.yml | head -5`

Expected: Shows workflow name and trigger configuration

- [ ] **Step 3: Commit workflow**

```bash
git add .github/workflows/validate-pr.yml
git commit -m "feat: add PR validation workflow for conventional commits"
```

---

### Task 2: Create Changelog Generation Workflow

**Files:**
- Create: `.github/workflows/changelog.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Update Changelog

on:
  push:
    branches: [main]

jobs:
  changelog:
    name: Generate Changelog
    runs-on: ubuntu-latest
    
    permissions:
      contents: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install conventional-changelog-cli
        run: npm install -g conventional-changelog-cli

      - name: Check if CHANGELOG.md exists
        id: check_changelog
        run: |
          if [ -f CHANGELOG.md ]; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Create initial CHANGELOG.md if missing
        if: steps.check_changelog.outputs.exists == 'false'
        run: |
          cat > CHANGELOG.md << 'EOF'
          # Changelog

          All notable changes to this project will be documented in this file.

          The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
          and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

          EOF

      - name: Generate changelog
        run: conventional-changelog -p angular -i CHANGELOG.md -s

      - name: Check if changelog was updated
        id: check_changes
        run: |
          if git diff --quiet CHANGELOG.md; then
            echo "No changes to CHANGELOG.md"
            echo "updated=false" >> $GITHUB_OUTPUT
          else
            echo "CHANGELOG.md was updated"
            echo "updated=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit and push changelog
        if: steps.check_changes.outputs.updated == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md
          git commit -m "chore: update CHANGELOG.md [skip ci]"
          git push
```

- [ ] **Step 2: Verify file was created**

Run: `cat .github/workflows/changelog.yml | head -5`

Expected: Shows workflow name and push trigger

- [ ] **Step 3: Commit workflow**

```bash
git add .github/workflows/changelog.yml
git commit -m "feat: add changelog generation workflow"
```

---

### Task 3: Create Bug Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`

- [ ] **Step 1: Create directory if needed**

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 2: Create bug template file**

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

- [ ] **Step 3: Verify file was created**

Run: `cat .github/ISSUE_TEMPLATE/bug.yml | head -3`

Expected: Shows name and description fields

- [ ] **Step 4: Commit template**

```bash
git add .github/ISSUE_TEMPLATE/bug.yml
git commit -m "feat: add bug report issue template"
```

---

### Task 4: Create Feature Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature.yml`

- [ ] **Step 1: Create feature template file**

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

- [ ] **Step 2: Verify file was created**

Run: `cat .github/ISSUE_TEMPLATE/feature.yml | head -3`

Expected: Shows name and description fields

- [ ] **Step 3: Commit template**

```bash
git add .github/ISSUE_TEMPLATE/feature.yml
git commit -m "feat: add feature request issue template"
```

---

### Task 5: Create Chore Issue Template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/chore.yml`

- [ ] **Step 1: Create chore template file**

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

- [ ] **Step 2: Verify file was created**

Run: `cat .github/ISSUE_TEMPLATE/chore.yml | head -3`

Expected: Shows name and description fields

- [ ] **Step 3: Commit template**

```bash
git add .github/ISSUE_TEMPLATE/chore.yml
git commit -m "feat: add chore issue template"
```

---

### Task 6: Create Initial CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

- [ ] **Step 1: Create CHANGELOG.md scaffold**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Features
- Add PR validation workflow for conventional commits
- Add changelog generation workflow
- Add structured issue templates (bug, feature, chore)

## [0.1.0] - 2026-05-15

### Features
- Initial release with GitHub notification triage
- Dark mode UI implementation
- Intelligent prioritization, filtering, and grouping
- Background sync functionality
```

- [ ] **Step 2: Verify file was created**

Run: `cat CHANGELOG.md | head -10`

Expected: Shows changelog header and format description

- [ ] **Step 3: Commit changelog**

```bash
git add CHANGELOG.md
git commit -m "docs: add initial CHANGELOG.md"
```

---

### Task 7: Create Branch Protection Documentation

**Files:**
- Create: `docs/BRANCH_PROTECTION.md`

- [ ] **Step 1: Create branch protection setup guide**

```markdown
# Branch Protection Setup

To complete the release workflow automation, configure branch protection rules on GitHub.

## Steps

1. **Navigate to repository settings:**
   - Go to your repository on GitHub
   - Click **Settings** (top navigation)
   - Click **Branches** (left sidebar under "Code and automation")

2. **Add branch protection rule:**
   - Click **Add branch protection rule**
   - In "Branch name pattern", enter: `main`

3. **Configure protection settings:**

   Enable these options:

   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: 0 (or set to 1+ if you want peer review)
     - ✅ Dismiss stale pull request approvals when new commits are pushed (optional)
     - ✅ Require review from Code Owners (if you have CODEOWNERS file)

   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Search and select these required checks:
       - `Validate PR Title and Commits` (from validate-pr workflow)
       - `Lint · Typecheck · Test · Build` (from ci workflow)

   - ✅ **Require conversation resolution before merging** (optional but recommended)

   - ✅ **Do not allow bypassing the above settings**
     - Ensures even admins must follow the workflow

   - ❌ **Allow force pushes** - Leave DISABLED
   - ❌ **Allow deletions** - Leave DISABLED

4. **Save changes:**
   - Click **Create** at the bottom of the page

## Verification

After setup, test the protection:

1. Try pushing directly to main:
   ```bash
   git push origin main
   ```
   Expected: Push rejected with protection message

2. Create a PR with invalid commit format:
   - Should see `Validate PR Title and Commits` check fail
   - Merge button should be disabled

3. Fix the commit format:
   - Check should pass
   - Merge button should become enabled (if all checks pass)

## Troubleshooting

**Status checks not appearing:**
- The workflows must run at least once before they appear in the list
- Push this branch to GitHub and open a test PR to main
- After workflows run, they'll be available for selection

**Can't select required checks:**
- Make sure workflows have run successfully at least once
- Check that workflow names match exactly (case-sensitive)
- Wait a few minutes and refresh the page

**Accidentally locked yourself out:**
- Repository admins can temporarily disable branch protection
- Fix the issue, then re-enable protection
- Consider the "Allow specified actors to bypass" option for emergencies
```

- [ ] **Step 2: Verify file was created**

Run: `cat docs/BRANCH_PROTECTION.md | head -10`

Expected: Shows branch protection setup header and introduction

- [ ] **Step 3: Commit documentation**

```bash
git add docs/BRANCH_PROTECTION.md
git commit -m "docs: add branch protection setup guide"
```

---

### Task 8: Update Design Spec with Implementation Status

**Files:**
- Modify: `docs/superpowers/specs/2026-05-16-release-workflow-automation-design.md`

- [ ] **Step 1: Add implementation status section to spec**

Add at the top of the file, after the title:

```markdown
**Status:** ✅ Implemented on `feat/release-workflow` branch

**Implementation:** See `docs/superpowers/plans/2026-05-16-release-workflow-automation.md`
```

- [ ] **Step 2: Verify update**

Run: `head -15 docs/superpowers/specs/2026-05-16-release-workflow-automation-design.md`

Expected: Shows status and implementation reference

- [ ] **Step 3: Commit spec update**

```bash
git add docs/superpowers/specs/2026-05-16-release-workflow-automation-design.md
git commit -m "docs: mark release workflow spec as implemented"
```

---

### Task 9: Create PR to release/1

**Files:**
- None (git operation)

- [ ] **Step 1: Push feature branch to remote**

```bash
git push -u origin feat/release-workflow
```

Expected: Branch pushed successfully, remote tracking set up

- [ ] **Step 2: Verify recent commits**

Run: `git log --oneline -8`

Expected: Shows all commits from this implementation

- [ ] **Step 3: Create PR using gh CLI**

```bash
gh pr create --base release/1 --title "feat: add release workflow automation" --body "$(cat <<'EOF'
## Summary

Implements automated release workflow with:
- PR validation for conventional commit format (titles and commits)
- Auto-generated CHANGELOG.md from conventional commits
- Structured issue templates (bug, feature, chore)
- Branch protection setup documentation

## Changes

### Workflows
- `.github/workflows/validate-pr.yml` - Validates PR titles and commit messages
- `.github/workflows/changelog.yml` - Generates CHANGELOG.md after merge to main

### Issue Templates
- `.github/ISSUE_TEMPLATE/bug.yml` - Structured bug reports
- `.github/ISSUE_TEMPLATE/feature.yml` - Structured feature requests
- `.github/ISSUE_TEMPLATE/chore.yml` - Structured chore tracking

### Documentation
- `CHANGELOG.md` - Initial changelog with release history
- `docs/BRANCH_PROTECTION.md` - Branch protection setup guide
- `docs/superpowers/specs/2026-05-16-release-workflow-automation-design.md` - Design spec
- `docs/superpowers/plans/2026-05-16-release-workflow-automation.md` - Implementation plan

## Manual Setup Required

After merging to `release/1`, follow `docs/BRANCH_PROTECTION.md` to:
1. Configure branch protection on `main` branch
2. Require `Validate PR Title and Commits` check
3. Require `Lint · Typecheck · Test · Build` check

## Test Plan

- [ ] Verify PR validation workflow syntax
- [ ] Verify changelog generation workflow syntax
- [ ] Check issue templates render correctly on GitHub
- [ ] Test workflows after merge to release/1
- [ ] When release/1 merges to main, verify:
  - [ ] PR validation runs and enforces conventional commits
  - [ ] Changelog is generated automatically
  - [ ] Bot commit includes `[skip ci]` flag

## Related

Design spec: `docs/superpowers/specs/2026-05-16-release-workflow-automation-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created successfully, URL returned

- [ ] **Step 4: Open PR URL in browser (optional)**

Run: `gh pr view --web`

Expected: Browser opens to the new PR

---

## Post-Implementation Verification

After the PR is merged to `release/1`:

### Workflow Syntax Verification

```bash
# Validate workflow YAML syntax
gh workflow view validate-pr.yml
gh workflow view changelog.yml
```

Expected: Both workflows show valid syntax

### Issue Template Verification

1. Navigate to repository Issues → New issue
2. Verify three templates appear: Bug, Feature, Chore
3. Click each template and verify form fields render correctly

### Functional Testing (after merge to main)

**Test 1: PR Validation - Invalid Commit**
```bash
git checkout -b test/invalid-commit
echo "test" >> README.md
git add README.md
git commit -m "update readme"
git push -u origin test/invalid-commit
gh pr create --base main --title "test: invalid commit format"
```
Expected: `Validate PR Title and Commits` check fails

**Test 2: PR Validation - Invalid Title**
```bash
git checkout -b test/invalid-title
echo "test" >> README.md
git add README.md
git commit -m "test: valid commit"
git push -u origin test/invalid-title
gh pr create --base main --title "Update README"
```
Expected: `Validate PR Title and Commits` check fails

**Test 3: PR Validation - Valid Format**
```bash
git checkout -b test/valid-format
echo "test" >> README.md
git add README.md
git commit -m "docs: update readme"
git push -u origin test/valid-format
gh pr create --base main --title "docs: update readme"
```
Expected: All checks pass

**Test 4: Changelog Generation**
1. Merge a PR with conventional commits to main
2. Wait for `Update Changelog` workflow to complete
3. Check that CHANGELOG.md was updated
4. Verify bot commit: `chore: update CHANGELOG.md [skip ci]`
5. Verify no infinite loop (bot commit doesn't trigger changelog workflow)

### Branch Protection Testing

After following `docs/BRANCH_PROTECTION.md`:

```bash
# Should be rejected
git checkout main
git pull
echo "test" >> README.md
git add README.md
git commit -m "test: direct push"
git push origin main
```
Expected: Push rejected by branch protection

## Notes

- Workflows require at least one run before they appear in branch protection settings
- The changelog workflow creates CHANGELOG.md if it doesn't exist
- Bot commits include `[skip ci]` to prevent infinite loops
- Manual version bumping happens in main before publishing
- Issue templates auto-apply labels: `bug`, `feature`, `chore` + `dev`
