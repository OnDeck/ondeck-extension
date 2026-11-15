# Website Changelog Automation Setup

This document contains the files needed to set up automatic changelog updates in the `ondeck-site` repository.

## Overview

When a release is published in the extension repository, a `repository_dispatch` event is sent to the website repository with changelog data. The website repository receives this event and automatically updates the `Changelog.tsx` component.

## Required Files

### 1. GitHub Actions Workflow

**File:** `.github/workflows/changelog-update.yml`

```yaml
name: Changelog Update

on:
  repository_dispatch:
    types: [changelog_update]

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Update Changelog.tsx
        run: |
          node scripts/update-changelog-tsx.js '${{ toJson(github.event.client_payload) }}'

      - name: TypeScript check
        run: npm run typecheck

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/components/landing/Changelog.tsx
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore(changelog): update to v${{ github.event.client_payload.version }} [skip ci]"
            git push origin main
          fi

      - name: Output summary
        run: |
          echo "### Changelog Updated 📝" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Version:** v${{ github.event.client_payload.version }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Tag:** ${{ github.event.client_payload.tag }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Tone:** ${{ github.event.client_payload.tone }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Changes:**" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "${{ join(github.event.client_payload.items, '\n') }}" >> $GITHUB_STEP_SUMMARY
```

### 2. Update Script

**File:** `scripts/update-changelog-tsx.js`

```javascript
#!/usr/bin/env node
/**
 * Update Changelog.tsx with new version entry
 * Usage: node update-changelog-tsx.js '{"version":"1.0.0","date":"2026-05-30","tag":"launch","tone":"green","items":[...]}'
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import parser from '@babel/parser';
import generator from '@babel/generator';
import t from '@babel/types';

const __dirname = new URL('.', import.meta.url).pathname;
const changelogPath = join(__dirname, '../src/components/landing/Changelog.tsx');

/**
 * Parse command line argument
 */
function getPayload() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node update-changelog-tsx.js \'{"version":"1.0.0",...}\'');
    process.exit(1);
  }

  try {
    return JSON.parse(arg);
  } catch (error) {
    console.error('Invalid JSON payload:', error.message);
    process.exit(1);
  }
}

/**
 * Create new changelog entry as AST node
 */
function createEntryNode(payload) {
  return t.objectExpression([
    t.objectProperty(t.identifier('v'), t.stringLiteral(payload.version)),
    t.objectProperty(t.identifier('d'), t.stringLiteral(payload.date)),
    t.objectProperty(t.identifier('tag'), t.stringLiteral(payload.tag)),
    t.objectProperty(t.identifier('tone'), t.stringLiteral(payload.tone)),
    t.objectProperty(
      t.identifier('items'),
      t.arrayExpression(payload.items.map((item) => t.stringLiteral(item)))
    ),
  ]);
}

/**
 * Update Changelog.tsx
 */
function updateChangelog(payload) {
  // Read the file
  const code = readFileSync(changelogPath, 'utf8');

  // Parse to AST
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  // Find the entries array
  let updated = false;

  t.traverse(ast, {
    VariableDeclarator(path) {
      if (
        path.node.id.type === 'Identifier' &&
        path.node.id.name === 'entries' &&
        path.node.init &&
        path.node.init.type === 'ArrayExpression'
      ) {
        // Prepend new entry to the array
        const newEntry = createEntryNode(payload);
        path.node.init.elements.unshift(newEntry);
        updated = true;
      }
    },
  });

  if (!updated) {
    throw new Error('Could not find entries array in Changelog.tsx');
  }

  // Generate updated code
  const output = generator.default(ast, {
    retainLines: false,
    comments: true,
  });

  // Write back to file
  writeFileSync(changelogPath, output.code);
  console.log(`✅ Updated Changelog.tsx with version ${payload.version}`);
}

// Main
const payload = getPayload();
console.log('📝 Updating changelog with:', JSON.stringify(payload, null, 2));
updateChangelog(payload);
```

### 3. Install Dependencies

**In the website repository:**

```bash
npm install --save-dev @babel/parser @babel/generator @babel/types
```

## Setup Instructions

### Step 1: Create Scripts Directory

```bash
cd /path/to/ondeck-site
mkdir -p scripts
```

### Step 2: Add Update Script

Copy the `scripts/update-changelog-tsx.js` content above to:
```
ondeck-site/scripts/update-changelog-tsx.js
```

Make it executable:
```bash
chmod +x scripts/update-changelog-tsx.js
```

### Step 3: Add Workflow

Copy the `.github/workflows/changelog-update.yml` content above to:
```
ondeck-site/.github/workflows/changelog-update.yml
```

### Step 4: Install Dependencies

```bash
npm install --save-dev @babel/parser @babel/generator @babel/types
```

### Step 5: Test Locally

Test the script with sample data:

```bash
node scripts/update-changelog-tsx.js '{
  "version": "1.1.0",
  "date": "2026-05-30",
  "tag": "feature",
  "tone": "blue",
  "items": [
    "Test feature 1",
    "Test feature 2"
  ]
}'
```

Check that `src/components/landing/Changelog.tsx` was updated correctly.

### Step 6: Commit and Push

```bash
git add .github/workflows/changelog-update.yml
git add scripts/update-changelog-tsx.js
git add package.json package-lock.json
git commit -m "feat: add automated changelog updates"
git push origin main
```

## Testing the Integration

### Manual Test

From the extension repository, trigger a manual dispatch:

```bash
curl -X POST \
  -H "Authorization: token YOUR_PAT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OnDeck/ondeck-site/dispatches \
  -d '{
    "event_type": "changelog_update",
    "client_payload": {
      "version": "1.0.1",
      "date": "2026-05-30",
      "tag": "bugfix",
      "tone": "green",
      "items": ["Test update"]
    }
  }'
```

### Full Integration Test

1. In extension repository, create a test release branch
2. Add some commits with conventional commit messages
3. Open and merge PR to main
4. Check extension repository workflows complete
5. Check website repository receives dispatch and updates

## Troubleshooting

### Workflow doesn't trigger

- Check repository has Actions enabled
- Verify workflow file is on `main` branch
- Check workflow syntax is valid

### Script fails

- Verify dependencies are installed
- Check TypeScript syntax in Changelog.tsx
- Run script locally to debug

### Commit fails

- Check Git configuration is correct
- Verify `contents: write` permission is set
- Check for merge conflicts

## Expected Payload Format

The website repository expects this JSON payload:

```json
{
  "version": "1.0.0",
  "date": "2026-05-30",
  "tag": "launch" | "feature" | "bugfix" | "update" | "breaking",
  "tone": "green" | "blue" | "purple" | "red",
  "items": [
    "Human-readable change 1",
    "Human-readable change 2"
  ]
}
```

## Security Notes

- The `CHANGELOG_BOT_TOKEN` in the extension repository needs `repo` scope
- Store it as a repository secret in the extension repository
- Use a dedicated bot account or service account for the token
- Rotate the token every 90 days
