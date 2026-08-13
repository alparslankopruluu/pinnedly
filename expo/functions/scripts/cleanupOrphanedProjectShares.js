#!/usr/bin/env node
/**
 * One-time cleanup: deletes `shares` and `projectMembers` documents that
 * reference a project that no longer exists.
 *
 * Why this is needed: deleting a project only ever called
 * `db.recursiveDelete(projectRef)`, which removes the project doc and its
 * subcollections (tasks, activities) but NOT the separate top-level `shares`
 * and `projectMembers` collections that reference it by id. Those orphaned
 * docs keep showing up as a "shared with you" project for other members
 * (badge count, share-inbox entry) even though the project is gone, and
 * navigating into it just shows a "project not found" screen. The Cloud
 * Function that deletes a project (functions/src/contentAccess.ts,
 * deleteOwnedContent) now cleans these up going forward — this script sweeps
 * whatever was already left behind before that fix shipped.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node functions/scripts/cleanupOrphanedProjectShares.js
 *
 * Safety:
 *   - Defaults to a dry run (reports what WOULD be deleted, writes nothing).
 *   - Pass --apply to actually commit the deletions.
 *   - Idempotent: only touches docs whose referenced project doc is missing.
 */

const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

admin.initializeApp();
const db = admin.firestore();

async function projectExists(projectId) {
  const snap = await db.collection('projects').doc(projectId).get();
  return snap.exists;
}

async function findOrphanedShares() {
  const snap = await db.collection('shares').where('entityType', '==', 'project').get();
  const orphaned = [];
  for (const shareDoc of snap.docs) {
    const projectId = shareDoc.data().entityId;
    if (typeof projectId === 'string' && !(await projectExists(projectId))) {
      orphaned.push(shareDoc);
    }
  }
  return orphaned;
}

async function findOrphanedMembers() {
  const snap = await db.collection('projectMembers').get();
  const orphaned = [];
  const checked = new Map();
  for (const memberDoc of snap.docs) {
    const projectId = memberDoc.data().projectId;
    if (typeof projectId !== 'string') continue;
    if (!checked.has(projectId)) {
      checked.set(projectId, await projectExists(projectId));
    }
    if (!checked.get(projectId)) {
      orphaned.push(memberDoc);
    }
  }
  return orphaned;
}

async function main() {
  console.log(APPLY ? 'Running cleanup (deletes enabled)...' : 'Dry run — no deletes will be made. Pass --apply to commit.');

  const [orphanedShares, orphanedMembers] = await Promise.all([
    findOrphanedShares(),
    findOrphanedMembers(),
  ]);

  console.log(`Found ${orphanedShares.length} orphaned share(s) and ${orphanedMembers.length} orphaned member(s).`);
  [...orphanedShares, ...orphanedMembers].forEach((doc) => {
    console.log(`  ${doc.ref.path} -> project ${doc.data().entityId ?? doc.data().projectId}`);
  });

  if (APPLY) {
    const allDocs = [...orphanedShares, ...orphanedMembers];
    for (let i = 0; i < allDocs.length; i += 400) {
      const batch = db.batch();
      allDocs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`\nDeleted ${allDocs.length} orphaned document(s).`);
  } else {
    console.log('\nThis was a dry run. Re-run with --apply to commit these deletions.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
