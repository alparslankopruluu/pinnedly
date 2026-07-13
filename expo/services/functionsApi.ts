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

  let response: Response;
  try {
    response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new FunctionsApiError(
      error instanceof Error ? error.message : 'Network request failed',
      undefined,
      'NETWORK_ERROR'
    );
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
