import Constants from 'expo-constants';
import { getCurrentUserToken } from '@/lib/auth';

export class FunctionsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FunctionsApiError';
  }
}

/**
 * Cloud Function cold starts (plus the server-side entitlement check) can take
 * several seconds. Without a ceiling the request hangs forever and the screen
 * that awaits it looks frozen. `mutateContent` itself is capped at 30s server
 * side, so 20s here fails fast enough to stay actionable.
 */
const REQUEST_TIMEOUT_MS = 20_000;

export function getFunctionsBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { functionsBaseUrl?: string } | undefined;
  return (extra?.functionsBaseUrl ?? 'https://europe-west1-pinnedly-48c49.cloudfunctions.net')
    .replace(/\/$/, '');
}

export async function callAuthenticatedFunction<T>(
  name: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = await getCurrentUserToken();
  if (!token) throw new FunctionsApiError('Authentication required', 401, 'AUTH_REQUIRED');

  // React Native polyfills AbortController but not AbortSignal.timeout, so the
  // deadline is driven by an explicit timer.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new FunctionsApiError('Request timed out', undefined, 'TIMEOUT');
    }
    throw new FunctionsApiError(
      error instanceof Error ? error.message : 'Network request failed',
      undefined,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    [key: string]: unknown;
  };
  if (!response.ok) {
    throw new FunctionsApiError(
      payload.error || 'Request failed',
      response.status,
      payload.code,
      payload
    );
  }
  return payload as T;
}
