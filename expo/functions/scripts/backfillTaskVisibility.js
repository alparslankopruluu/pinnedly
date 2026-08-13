#!/usr/bin/env node
/**
 * One-time backfill: sets `visibility: 'shared'` and `sharedWith: []` on every
 * existing project task that predates the task-visibility feature (i.e. has no
 * `visibility` field at all).
 *
 * Why this is needed: the Firestore rule for reading a project's tasks is
 * changing so that non-owner members must satisfy a per-task condition
 * (visibility/sharedWith/assignedTo). Firestore query filters like
 * where('visibility','==','shared') only match documents where that field is
 * physically present — a document with no `visibility` field at all matches
 * NEITHER `== 'shared'` NOR `!= 'private'`. Without this backfill, every
 * existing task would become invisible to non-owner project members the
 * moment the new firestore.rules are deployed. Run this BEFORE deploying the
 * updated rules.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node functions/scripts/backfillTaskVisibility.js
 *
 * Safety:
 *   - Defaults to a dry run (reports what WOULD change, writes nothing).
 *   - Pass --apply to actually commit the writes.
 *   - Idempotent: only touches tasks where `visibility` is undefined, so it's
 *     safe to re-run (e.g. if a previous run was interrupted).
 */

const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

admin.initializeApp();
const db = admin.firestore();

async function backfillProject(projectRef) {
  const tasksSnap = await projectRef.collection('tasks').get();
  const staleTaskDocs = tasksSnap.docs.filter((taskDoc) => taskDoc.data().visibility === undefined);

  if (staleTaskDocs.length === 0) return { projectId: projectRef.id, updated: 0 };

  if (APPLY) {
    // Firestore batches cap at 500 writes; chunk defensively even though a
    // single project's task list is expected to be far smaller than that.
    for (let i = 0; i < staleTaskDocs.length; i += 400) {
      const batch = db.batch();
      for (const taskDoc of staleTaskDocs.slice(i, i + 400)) {
        batch.update(taskDoc.ref, { visibility: 'shared', sharedWith: [] });
      }
      await batch.commit();
    }
  }

  return { projectId: projectRef.id, updated: staleTaskDocs.length };
}

async function main() {
  console.log(APPLY ? 'Running backfill (writes enabled)...' : 'Dry run — no writes will be made. Pass --apply to commit.');

  const projectRefs = await db.collection('projects').listDocuments();
  console.log(`Found ${projectRefs.length} project(s).`);

  let totalUpdated = 0;
  let projectsWithChanges = 0;

  for (const projectRef of projectRefs) {
    const result = await backfillProject(projectRef);
    if (result.updated > 0) {
      projectsWithChanges += 1;
      totalUpdated += result.updated;
      console.log(`  ${APPLY ? 'Updated' : 'Would update'} ${result.updated} task(s) in project ${result.projectId}`);
    }
  }

  console.log(
    `\nDone. ${APPLY ? 'Updated' : 'Would update'} ${totalUpdated} task(s) across ${projectsWithChanges} project(s).`
  );
  if (!APPLY) {
    console.log('This was a dry run. Re-run with --apply to commit these changes.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
