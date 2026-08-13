import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import i18next from 'i18next';

import { removeActivitiesByRelatedId } from '../lib/activityState.ts';
import {
  beginPendingDeletion,
  excludePendingDeletions,
  removeItemOptimistically,
  restoreOptimisticallyDeletedItem,
} from '../lib/deletionState.ts';
import { runDialogButtonAction } from '../lib/dialogActions.ts';
import { removeMemberAfterRequest } from '../lib/projectMemberState.ts';
import { buildProjectActivityBaseline, mergeProjectActivities } from '../lib/projectActivityState.ts';
import {
  isPublicBookmarkList,
  matchesBookmarkListSearch,
  upsertBookmarkList,
} from '../lib/bookmarkListState.ts';
import { buildInviteWebUrl } from '../constants/links.ts';
import { getSafePostAuthRoute } from '../lib/authRedirect.ts';
import { normalizeInvitePath } from '../lib/inviteRouting.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const localeDir = join(testDir, '..', 'locales');

test('invite sharing uses a clickable HTTPS app link and preserves the invite route', () => {
  const token = 'invite_token-123';
  const inviteUrl = buildInviteWebUrl(token);
  assert.equal(inviteUrl, `https://pinnedly-48c49.web.app/invite/${token}`);
  assert.equal(normalizeInvitePath(inviteUrl), `/invite/${token}`);
  assert.equal(normalizeInvitePath(`draft://invite/${token}`), `/invite/${token}`);
  assert.equal(getSafePostAuthRoute(`/invite/${token}`), `/invite/${token}`);
  assert.equal(getSafePostAuthRoute('https://example.com'), '/(tabs)');
});

test('native and hosted association files cover the invite path and Play signing certificate', () => {
  const appConfig = JSON.parse(readFileSync(join(testDir, '..', 'app.json'), 'utf8')).expo;
  const appLinks = appConfig.android.intentFilters.find((filter) => filter.autoVerify === true);
  assert.ok(appLinks.data.some((entry) => entry.host === 'pinnedly-48c49.web.app' && entry.pathPrefix === '/invite/'));
  assert.ok(appConfig.ios.associatedDomains.includes('applinks:pinnedly-48c49.web.app'));

  const assetLinks = JSON.parse(readFileSync(join(testDir, '..', 'hosting', '.well-known', 'assetlinks.json'), 'utf8'));
  const fingerprints = assetLinks[0].target.sha256_cert_fingerprints;
  assert.ok(fingerprints.includes('E3:7C:E3:7F:81:FB:6F:67:F7:45:4C:5E:A3:F6:1B:DC:A1:AA:C9:08:68:ED:EF:90:CE:51:E7:D8:E5:42:B6:4D'));

  const association = JSON.parse(readFileSync(join(testDir, '..', 'hosting', '.well-known', 'apple-app-site-association'), 'utf8'));
  assert.ok(association.applinks.details[0].appIDs.includes('UYDAF6RY67.app.techtactoe.draft'));
});

test('ordinary dialog actions run immediately after dismissal', () => {
  const events = [];
  runDialogButtonAction(
    { onPress: () => events.push('action') },
    () => events.push('dismiss'),
    () => events.push('deferred')
  );
  assert.deepEqual(events, ['dismiss', 'action']);
});

test('native-modal actions wait for dismissal and run at most once', () => {
  const events = [];
  let deferredAction;
  runDialogButtonAction(
    { deferUntilDismiss: true, onPress: () => events.push('action') },
    () => events.push('dismiss'),
    (action) => {
      events.push('deferred');
      deferredAction = action;
    }
  );

  assert.deepEqual(events, ['dismiss', 'deferred']);
  deferredAction();
  deferredAction();
  assert.deepEqual(events, ['dismiss', 'deferred', 'action']);
});

test('activity cleanup removes only records related to the deleted entity', () => {
  const activities = [
    { id: '1', type: 'note_added', title: 'Note', timestamp: 1, relatedId: 'deleted' },
    { id: '2', type: 'todo_added', title: 'Todo', timestamp: 2, relatedId: 'kept' },
    { id: '3', type: 'bookmark_opened', title: 'Bookmark', timestamp: 3 },
  ];

  assert.deepEqual(
    removeActivitiesByRelatedId(activities, 'deleted').map((activity) => activity.id),
    ['2', '3']
  );
});

for (const entity of ['todo', 'note']) {
  test(`${entity} deletion removes immediately, blocks stale snapshots and rolls back in order`, () => {
    const original = [{ id: 'before' }, { id: 'deleted' }, { id: 'after' }];
    const pending = new Set();
    assert.equal(beginPendingDeletion(pending, 'deleted'), true);
    assert.equal(beginPendingDeletion(pending, 'deleted'), false, 'double tap must not start another request');

    const optimistic = removeItemOptimistically(original, 'deleted', (item) => item.id);
    assert.deepEqual(optimistic.items.map((item) => item.id), ['before', 'after']);
    assert.deepEqual(
      excludePendingDeletions(original, pending, (item) => item.id).map((item) => item.id),
      ['before', 'after'],
      'an intermediate subscription snapshot must not re-add the item'
    );
    assert.deepEqual(
      restoreOptimisticallyDeletedItem(optimistic.items, optimistic.deletion, (item) => item.id),
      original,
      'an API failure must restore the item at its previous position'
    );
  });
}

test('member removal updates only after API success and preserves the member on failure', async () => {
  const members = [{ userId: 'owner' }, { userId: 'member' }];
  const removed = await removeMemberAfterRequest(
    () => members,
    'member',
    (member) => member.userId,
    async () => {}
  );
  assert.deepEqual(removed, [{ userId: 'owner' }]);

  await assert.rejects(
    removeMemberAfterRequest(
      () => members,
      'member',
      (member) => member.userId,
      async () => { throw new Error('network failed'); }
    ),
    /network failed/
  );
  assert.deepEqual(members, [{ userId: 'owner' }, { userId: 'member' }]);
});

test('project activity baseline is merged with server events without duplicate creation rows', () => {
  const project = {
    id: 'project-1',
    title: 'Launch',
    createdAt: 10,
    updatedAt: 10,
    userId: 'owner',
    tasks: [{ id: 'task-1', projectId: 'project-1', title: 'Ship', status: 'todo', createdAt: 20 }],
    collaborators: [],
  };
  const notes = [{
    id: 'note-1',
    title: 'Brief',
    markdown: '',
    createdAt: 30,
    updatedAt: 30,
    userId: 'owner',
    links: [{ type: 'project', id: 'project-1' }],
  }];
  const baseline = buildProjectActivityBaseline(project, notes);
  const server = [{
    id: 'server-task',
    projectId: 'project-1',
    type: 'task_created',
    relatedEntityId: 'task-1',
    relatedEntityType: 'task',
    entityTitle: 'Ship',
    timestamp: 21,
    source: 'server',
  }];

  const merged = mergeProjectActivities(server, baseline);
  assert.equal(merged.filter((activity) => activity.type === 'task_created').length, 1);
  assert.deepEqual(merged.map((activity) => activity.type), [
    'note_added',
    'task_created',
    'project_created',
  ]);
});

test('list cache routing keeps private lists out of Discover and public lists in both caches', () => {
  const privateList = {
    id: 'private', name: 'Private', isPublic: false, visibility: 'private', ownerId: 'u',
    followerCount: 0, bookmarkIds: [], bookmarks: [], createdAt: 1, updatedAt: 1,
  };
  const publicList = { ...privateList, id: 'public', name: 'Travel Ideas', isPublic: true, visibility: 'public' };

  assert.equal(isPublicBookmarkList(privateList), false);
  assert.equal(isPublicBookmarkList(publicList), true);
  assert.deepEqual(upsertBookmarkList([], privateList).map((list) => list.id), ['private']);
  assert.equal(matchesBookmarkListSearch(privateList, 'private'), true);
  assert.equal(matchesBookmarkListSearch(publicList, 'travel'), true);
});

test('project activity rules allow access reads but never client writes', () => {
  const rules = readFileSync(join(testDir, '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/activities\/\{activityId\}/);
  assert.match(rules, /allow read: if canAccessProject\(projectId\);/);
  assert.match(rules, /allow create, update, delete: if false;/);
});

test('every locale resolves the sign-out labels instead of returning raw keys', async () => {
  const keys = ['title', 'subtitle', 'confirmMessage'];
  const localeFiles = readdirSync(localeDir).filter((file) => file.endsWith('.json'));
  assert.equal(localeFiles.length, 10);
  const resources = {};

  for (const file of localeFiles) {
    const locale = JSON.parse(readFileSync(join(localeDir, file), 'utf8'));
    resources[file.replace('.json', '')] = { translation: locale };
    for (const key of keys) {
      const value = locale.settings?.signOut?.[key];
      assert.equal(typeof value, 'string', `${file}: settings.signOut.${key} must be a string`);
      assert.notEqual(value, `settings.signOut.${key}`, `${file}: raw translation key leaked`);
      assert.ok(value.trim().length > 0, `${file}: settings.signOut.${key} is empty`);
    }
  }

  const instance = i18next.createInstance();
  await instance.init({ resources, fallbackLng: 'en', interpolation: { escapeValue: false } });
  for (const language of Object.keys(resources)) {
    await instance.changeLanguage(language);
    for (const key of keys) {
      assert.notEqual(instance.t(`settings.signOut.${key}`), `settings.signOut.${key}`);
    }
  }

  const turkish = JSON.parse(readFileSync(join(localeDir, 'tr.json'), 'utf8'));
  assert.equal(turkish.settings.signOut.title, 'Çıkış Yap');
});

test('every locale contains project activity, list tab and project status labels', () => {
  const localeFiles = readdirSync(localeDir).filter((file) => file.endsWith('.json'));
  for (const file of localeFiles) {
    const locale = JSON.parse(readFileSync(join(localeDir, file), 'utf8'));
    const values = [
      locale.projectActivities?.project_created,
      locale.projectActivities?.task_created,
      locale.projectActivities?.task_status_changed,
      locale.projectActivities?.note_added,
      locale.projects?.filters?.projectStatusLabel,
      locale.discoverLists?.tabs?.my,
      locale.discoverLists?.tabs?.discover,
      locale.discoverLists?.noMyLists,
      locale.discoverLists?.savedCount,
      locale.home?.shareInbox?.title,
      locale.home?.shareInbox?.description,
      locale.home?.shareInbox?.count,
      locale.home?.shareInbox?.projectsTitle,
      locale.home?.shareInbox?.projectsDescription,
      locale.home?.shareInbox?.projectCount,
    ];
    values.forEach((value) => {
      assert.equal(typeof value, 'string', `${file}: missing regression localization`);
      assert.ok(value.trim().length > 0, `${file}: empty regression localization`);
    });
  }
});
