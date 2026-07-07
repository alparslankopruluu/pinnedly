import Constants from 'expo-constants';
import { getCurrentUserToken } from '@/lib/auth';

export interface WorkspaceChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkspaceChatCitation {
  type: 'note' | 'bookmark' | 'project' | 'todo';
  id: string;
  title: string;
}

export interface WorkspaceChatResponse {
  answer: string;
  citedItems?: WorkspaceChatCitation[];
}

export type WorkspaceChatErrorCode =
  | 'AUTH_REQUIRED'
  | 'MESSAGE_REQUIRED'
  | 'NETWORK_ERROR'
  | 'REQUEST_FAILED'
  | 'INVALID_RESPONSE'
  | 'EMPTY_RESPONSE'
  | 'TIMEOUT';

interface WorkspaceChatErrorBody {
  error?: string;
  code?: string;
  requestId?: string;
}

const REQUEST_TIMEOUT_MS = 65_000;

function getFunctionsUrl(): string {
  const extra = Constants.expoConfig?.extra as { aiFunctionsUrl?: string } | undefined;
  return (
    extra?.aiFunctionsUrl ??
    'https://us-central1-pinnedly-48c49.cloudfunctions.net/aiWorkspaceChat'
  );
}

export class WorkspaceChatError extends Error {
  constructor(
    message: string,
    public readonly code: WorkspaceChatErrorCode,
    public readonly status?: number,
    public readonly requestId?: string,
    public readonly serverMessage?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WorkspaceChatError';
  }
}

async function readJsonBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new WorkspaceChatError(
      'Invalid response from workspace assistant',
      'INVALID_RESPONSE',
      response.status,
      undefined,
      text.slice(0, 200),
      error
    );
  }
}

export async function sendWorkspaceChat(
  message: string,
  conversation: WorkspaceChatMessage[] = []
): Promise<WorkspaceChatResponse> {
  const token = await getCurrentUserToken();
  if (!token) {
    throw new WorkspaceChatError('Authentication required', 'AUTH_REQUIRED', 401);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getFunctionsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversation }),
      signal: controller.signal,
    });

    const data = await readJsonBody<WorkspaceChatResponse & WorkspaceChatErrorBody>(response);

    if (!response.ok) {
      const code =
        response.status === 401
          ? 'AUTH_REQUIRED'
          : response.status === 400
            ? 'MESSAGE_REQUIRED'
            : 'REQUEST_FAILED';

      throw new WorkspaceChatError(
        data?.error || 'Workspace assistant request failed',
        code,
        response.status,
        data?.requestId,
        data?.error
      );
    }

    if (!data?.answer?.trim()) {
      throw new WorkspaceChatError(
        'Workspace assistant returned an empty response',
        'EMPTY_RESPONSE',
        response.status,
        data?.requestId
      );
    }

    return data;
  } catch (error) {
    if (error instanceof WorkspaceChatError) {
      throw error;
    }

    const isAbort = error instanceof Error && error.name === 'AbortError';
    throw new WorkspaceChatError(
      isAbort ? 'Workspace assistant request timed out' : 'Network request failed',
      isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      undefined,
      undefined,
      undefined,
      error
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
