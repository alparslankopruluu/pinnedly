import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appInfoDirectory = path.join(root, 'metadata', 'app-info');
const versionDirectory = path.join(root, 'metadata', 'version', '1.0');
const locales = ['ar-SA', 'de-DE', 'en-US', 'es-ES', 'it', 'ja', 'pt-PT', 'ru', 'tr', 'zh-Hans'];
const errors = [];

function characterLength(value) {
  return Array.from(value).length;
}

function readJson(directory, locale) {
  const filename = path.join(directory, `${locale}.json`);
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    errors.push(`${filename}: ${error.message}`);
    return {};
  }
}

function requireString(data, field, locale, limit) {
  const value = data[field];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${locale}.${field}: required non-empty string`);
    return '';
  }
  if (limit && characterLength(value) > limit) {
    errors.push(`${locale}.${field}: ${characterLength(value)} characters exceeds ${limit}`);
  }
  return value;
}

function validateUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      errors.push(`${label}: must use HTTPS`);
    }
  } catch {
    errors.push(`${label}: invalid URL`);
  }
}

function normalizedWords(value, locale) {
  return new Set(
    (value.normalize('NFKC').toLocaleLowerCase(locale).match(/[\p{L}\p{N}]+/gu) ?? [])
      .filter(Boolean),
  );
}

function validateKeywords(value, locale, indexedText) {
  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength > 100) {
    errors.push(`${locale}.keywords: ${byteLength} UTF-8 bytes exceeds 100`);
  }
  if (/,\s|\s,/.test(value)) {
    errors.push(`${locale}.keywords: remove whitespace around commas`);
  }

  const indexedWords = normalizedWords(indexedText, locale);
  const seen = new Set();
  for (const rawTerm of value.split(',')) {
    const term = rawTerm.trim();
    const normalized = term.normalize('NFKC').toLocaleLowerCase(locale);
    if (!term) {
      errors.push(`${locale}.keywords: empty term`);
      continue;
    }
    if (characterLength(normalized.replace(/\s+/gu, '')) < 3) {
      errors.push(`${locale}.keywords: "${term}" must contain at least 3 characters`);
    }
    if (seen.has(normalized)) {
      errors.push(`${locale}.keywords: duplicate term "${term}"`);
    }
    seen.add(normalized);
    if (!normalized.includes(' ') && indexedWords.has(normalized)) {
      errors.push(`${locale}.keywords: "${term}" already appears in the name or subtitle`);
    }
  }
}

const discoveredAppInfo = fs.readdirSync(appInfoDirectory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -5))
  .sort();
const discoveredVersion = fs.readdirSync(versionDirectory)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -5))
  .sort();

for (const [label, discovered] of [
  ['app-info', discoveredAppInfo],
  ['version', discoveredVersion],
]) {
  const expected = [...locales].sort();
  if (JSON.stringify(discovered) !== JSON.stringify(expected)) {
    errors.push(`${label}: expected locales ${expected.join(', ')}, found ${discovered.join(', ')}`);
  }
}

const rows = [];
for (const locale of locales) {
  const appInfo = readJson(appInfoDirectory, locale);
  const version = readJson(versionDirectory, locale);

  const name = requireString(appInfo, 'name', locale, 30);
  const subtitle = requireString(appInfo, 'subtitle', locale, 30);
  const privacyPolicyUrl = requireString(appInfo, 'privacyPolicyUrl', locale);
  const description = requireString(version, 'description', locale, 4000);
  const keywords = requireString(version, 'keywords', locale);
  const promotionalText = requireString(version, 'promotionalText', locale, 170);
  const releaseNotes = requireString(version, 'releaseNotes', locale, 4000);
  const supportUrl = requireString(version, 'supportUrl', locale);

  if (privacyPolicyUrl) validateUrl(privacyPolicyUrl, `${locale}.privacyPolicyUrl`);
  if (supportUrl) validateUrl(supportUrl, `${locale}.supportUrl`);
  if (appInfo.privacyChoicesUrl) validateUrl(appInfo.privacyChoicesUrl, `${locale}.privacyChoicesUrl`);
  if (version.marketingUrl) validateUrl(version.marketingUrl, `${locale}.marketingUrl`);
  if (keywords) validateKeywords(keywords, locale, `${name} ${subtitle}`);

  rows.push({
    locale,
    name: characterLength(name),
    subtitle: characterLength(subtitle),
    keywordBytes: Buffer.byteLength(keywords, 'utf8'),
    promotion: characterLength(promotionalText),
    description: characterLength(description),
    releaseNotes: characterLength(releaseNotes),
  });
}

console.table(rows);

if (errors.length > 0) {
  console.error(`\nMetadata validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\nValidated ${locales.length} App Store localizations successfully.`);
