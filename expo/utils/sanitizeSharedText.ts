const LINKEDIN_NOISE_PATTERNS = [
  /urn:li:[^\s]*/gi,
  /activity-\d+/gi,
  /shareId=[^\s]*/gi,
  /[?&](?:utm_[^\s&]+|li_[^\s&]+|feedView)[^\s]*/gi,
  /\b\d{8,}\b/g,
];

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hasMeaningfulContent(text: string): boolean {
  const letters = text.replace(/[^a-zA-ZÀ-ÿğüşıöçĞÜŞİÖÇ]/g, '');
  return letters.length >= 2;
}

export function sanitizeSharedText(text: string, url?: string): string | undefined {
  if (!text?.trim()) return undefined;

  let cleaned = text.trim();

  if (url) {
    cleaned = cleaned.split(url).join(' ');
    try {
      const parsed = new URL(url);
      cleaned = cleaned.split(parsed.href).join(' ');
      cleaned = cleaned.split(`${parsed.origin}${parsed.pathname}`).join(' ');
    } catch {
      // keep going with raw url removal
    }
  }

  for (const pattern of LINKEDIN_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = collapseWhitespace(cleaned);

  if (!cleaned || !hasMeaningfulContent(cleaned)) {
    return undefined;
  }

  if (/^\d+$/.test(cleaned.replace(/\s/g, ''))) {
    return undefined;
  }

  return cleaned;
}

export function sanitizeMetadataDescription(description?: string, url?: string): string | undefined {
  if (!description?.trim()) return undefined;
  return sanitizeSharedText(description, url);
}