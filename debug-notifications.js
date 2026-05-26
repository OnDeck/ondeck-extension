#!/usr/bin/env node
/**
 * Debug script to compare GitHub notifications API with extension behavior
 * Usage: node debug-notifications.js YOUR_GITHUB_TOKEN
 */

const token = process.argv[2];

if (!token) {
  console.error('Usage: node debug-notifications.js YOUR_GITHUB_TOKEN');
  console.error('\nGet your token from chrome.storage.local in the extension:');
  console.error('1. Open extension popup');
  console.error('2. Open DevTools (Cmd+Option+I)');
  console.error('3. Console tab, run: chrome.storage.local.get("auth", (r) => console.log(r.auth.token))');
  process.exit(1);
}

async function fetchNotifications(params = {}) {
  const url = new URL('https://api.github.com/notifications');
  url.searchParams.set('all', params.all ?? 'false');
  url.searchParams.set('per_page', '50');
  if (params.since) {
    url.searchParams.set('since', params.since);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  console.log('🔍 Fetching GitHub notifications...\n');

  // Fetch without filters (what GitHub shows)
  console.log('1️⃣  ALL unread notifications (no filter):');
  const allNotifs = await fetchNotifications({ all: false });
  console.log(`   Total: ${allNotifs.length}`);

  if (allNotifs.length > 0) {
    console.log('\n   Latest 5:');
    allNotifs.slice(0, 5).forEach((n, i) => {
      const updatedAt = new Date(n.updated_at);
      const daysAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${i + 1}. [${n.reason}] ${n.subject.title}`);
      console.log(`      Updated: ${updatedAt.toISOString()} (${daysAgo} days ago)`);
      console.log(`      Repo: ${n.repository.full_name}`);
    });

    console.log('\n   Oldest 5:');
    allNotifs.slice(-5).forEach((n, i) => {
      const updatedAt = new Date(n.updated_at);
      const daysAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${i + 1}. [${n.reason}] ${n.subject.title}`);
      console.log(`      Updated: ${updatedAt.toISOString()} (${daysAgo} days ago)`);
      console.log(`      Repo: ${n.repository.full_name}`);
    });
  }

  // Fetch with 30-day filter (what extension shows now)
  console.log('\n\n2️⃣  With 30-day filter (extension behavior):');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filtered = await fetchNotifications({ all: false, since: thirtyDaysAgo.toISOString() });
  console.log(`   Total: ${filtered.length}`);

  if (filtered.length > 0) {
    console.log('\n   Latest 5:');
    filtered.slice(0, 5).forEach((n, i) => {
      const updatedAt = new Date(n.updated_at);
      const daysAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${i + 1}. [${n.reason}] ${n.subject.title}`);
      console.log(`      Updated: ${updatedAt.toISOString()} (${daysAgo} days ago)`);
      console.log(`      Repo: ${n.repository.full_name}`);
    });
  }

  // Show difference
  console.log('\n\n📊 Summary:');
  console.log(`   Filtered out: ${allNotifs.length - filtered.length} old notifications`);

  if (allNotifs.length > 0) {
    const oldestInAll = new Date(allNotifs[allNotifs.length - 1].updated_at);
    const daysAgo = Math.floor((Date.now() - oldestInAll.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Oldest notification: ${daysAgo} days ago`);
  }

  // Breakdown by reason
  console.log('\n\n🏷️  Notifications by reason (all unread):');
  const byReason = {};
  allNotifs.forEach(n => {
    byReason[n.reason] = (byReason[n.reason] || 0) + 1;
  });
  Object.entries(byReason)
    .sort(([, a], [, b]) => b - a)
    .forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count}`);
    });
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
