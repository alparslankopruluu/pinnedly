import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appInfoDirectory = path.join(root, 'metadata', 'app-info');
const versionDirectory = path.join(root, 'metadata', 'version', '1.0');
const bundleId = 'app.techtactoe.draft';
const targetVersion = '1.0.5';
const previousDraftVersion = '1.0.4';
const locales = ['ar-SA', 'de-DE', 'en-US', 'es-ES', 'it', 'ja', 'pt-PT', 'ru', 'tr', 'zh-Hans'];
const editableStates = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'METADATA_REJECTED', 'REJECTED']);
const apiBase = 'https://api.appstoreconnect.apple.com';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Set ${name} before running this command`);
  return value.trim();
}

function createToken() {
  const keyId = requiredEnvironment('ASC_KEY_ID');
  const issuerId = requiredEnvironment('ASC_ISSUER_ID');
  const keyPath = path.resolve(requiredEnvironment('ASC_KEY_PATH'));
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
  })).toString('base64url');
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(unsignedToken), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  return `${unsignedToken}.${signature}`;
}

let token;

function authorizationToken() {
  token ??= createToken();
  return token;
}

async function request(resource) {
  const url = resource.startsWith('http') ? resource : `${apiBase}${resource}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authorizationToken()}`,
      Accept: 'application/json',
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body.errors?.map((error) => `${error.status} ${error.title}: ${error.detail}`).join('; ');
    throw new Error(`App Store Connect ${response.status}: ${details || response.statusText}`);
  }
  return body;
}

async function allResources(resource) {
  const items = [];
  let next = resource;
  while (next) {
    const page = await request(next);
    items.push(...(page.data ?? []));
    next = page.links?.next ?? null;
  }
  return items;
}

async function getApp() {
  const response = await request(`/v1/apps?filter%5BbundleId%5D=${encodeURIComponent(bundleId)}&limit=2`);
  if (response.data?.length !== 1) {
    throw new Error(`Expected one app for ${bundleId}, found ${response.data?.length ?? 0}`);
  }
  return response.data[0];
}

async function getVersions(appId) {
  return allResources(`/v1/apps/${appId}/appStoreVersions?filter%5Bplatform%5D=IOS&limit=50`);
}

function versionState(version) {
  return version.attributes?.appStoreState ?? version.attributes?.versionState ?? 'UNKNOWN';
}

async function preflight() {
  const app = await getApp();
  const versions = await getVersions(app.id);
  const target = versions.find((version) => version.attributes?.versionString === targetVersion);
  const previousDraft = versions.find((version) => version.attributes?.versionString === previousDraftVersion);
  const editable = target ?? previousDraft;

  if (!editable) {
    throw new Error(`Neither ${targetVersion} nor ${previousDraftVersion} exists as an editable iOS version`);
  }

  const state = versionState(editable);
  if (!editableStates.has(state)) {
    throw new Error(`iOS ${editable.attributes?.versionString} is ${state}; refusing to modify it`);
  }

  console.log(`App Store Connect preflight passed: ${app.attributes?.name ?? bundleId}`);
  console.log(`Editable iOS version: ${editable.attributes?.versionString} (${state})`);
  if (editable.attributes?.versionString === previousDraftVersion) {
    console.log(`Fastlane will update the editable version number in place to ${targetVersion}.`);
  }
}

function readJson(directory, locale) {
  return JSON.parse(fs.readFileSync(path.join(directory, `${locale}.json`), 'utf8'));
}

function compareField(mismatches, locale, field, expected, actual) {
  if ((expected ?? null) !== (actual ?? null)) {
    mismatches.push(`${locale}.${field}`);
  }
}

async function fetchRemoteMetadata() {
  const app = await getApp();
  const versions = await getVersions(app.id);
  const version = versions.find((candidate) => candidate.attributes?.versionString === targetVersion);
  if (!version) throw new Error(`iOS ${targetVersion} was not found after upload`);

  const versionLocalizations = await allResources(
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`,
  );
  const appInfos = await allResources(`/v1/apps/${app.id}/appInfos?limit=50`);
  const appInfo = appInfos.find((candidate) => editableStates.has(versionState(candidate))) ?? appInfos[0];
  if (!appInfo) throw new Error('No App Info resource was returned');
  const appInfoLocalizations = await allResources(
    `/v1/appInfos/${appInfo.id}/appInfoLocalizations?limit=50`,
  );

  return {
    version,
    versionLocalizations: new Map(
      versionLocalizations.map((item) => [item.attributes?.locale, item.attributes]),
    ),
    appInfoLocalizations: new Map(
      appInfoLocalizations.map((item) => [item.attributes?.locale, item.attributes]),
    ),
  };
}

async function verifyOnce() {
  const remote = await fetchRemoteMetadata();
  const mismatches = [];

  for (const locale of locales) {
    const expectedAppInfo = readJson(appInfoDirectory, locale);
    const expectedVersion = readJson(versionDirectory, locale);
    const actualAppInfo = remote.appInfoLocalizations.get(locale);
    const actualVersion = remote.versionLocalizations.get(locale);

    if (!actualAppInfo) {
      mismatches.push(`${locale}: missing App Info localization`);
    } else {
      compareField(mismatches, locale, 'name', expectedAppInfo.name, actualAppInfo.name);
      compareField(mismatches, locale, 'subtitle', expectedAppInfo.subtitle, actualAppInfo.subtitle);
      compareField(
        mismatches,
        locale,
        'privacyPolicyUrl',
        expectedAppInfo.privacyPolicyUrl,
        actualAppInfo.privacyPolicyUrl,
      );
    }

    if (!actualVersion) {
      mismatches.push(`${locale}: missing version localization`);
    } else {
      compareField(mismatches, locale, 'description', expectedVersion.description, actualVersion.description);
      compareField(mismatches, locale, 'keywords', expectedVersion.keywords, actualVersion.keywords);
      compareField(
        mismatches,
        locale,
        'promotionalText',
        expectedVersion.promotionalText,
        actualVersion.promotionalText,
      );
      compareField(mismatches, locale, 'releaseNotes', expectedVersion.releaseNotes, actualVersion.whatsNew);
      compareField(mismatches, locale, 'supportUrl', expectedVersion.supportUrl, actualVersion.supportUrl);
      if (expectedVersion.marketingUrl) {
        compareField(mismatches, locale, 'marketingUrl', expectedVersion.marketingUrl, actualVersion.marketingUrl);
      }
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Remote metadata mismatch: ${mismatches.join(', ')}`);
  }
  console.log(`Verified ${locales.length} App Store localizations for iOS ${targetVersion}.`);
}

async function verify() {
  const waits = [0, 2_000, 4_000, 8_000, 16_000];
  let lastError;
  for (const delay of waits) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await verifyOnce();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const command = process.argv[2];
if (command === 'preflight') {
  await preflight();
} else if (command === 'verify') {
  await verify();
} else {
  throw new Error('Usage: node scripts/appstore-connect-metadata.mjs <preflight|verify>');
}
