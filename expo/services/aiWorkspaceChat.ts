import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';

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
    public readonly status?: number
  ) {
    super(message);
    this.name = 'WorkspaceChatError';
  }
}

export async function sendWorkspaceChat(
  message: string,
  conversation: WorkspaceChatMessage[] = []
): Promise<WorkspaceChatResponse> {
  const user = auth().currentUser;
  if (!user) {
    throw new WorkspaceChatError('AUTH_REQUIRED', 401);
  }

  const token = await user.getIdToken();
  const response = await fetch(getFunctionsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversation }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new WorkspaceChatError('AUTH_REQUIRED', 401);
    }
    throw new WorkspaceChatError('REQUEST_FAILED', response.status);
  }

  const data = (await response.json()) as WorkspaceChatResponse;
  if (!data.answer?.trim()) {
    throw new WorkspaceChatError('EMPTY_RESPONSE');
  }

  return data;
}