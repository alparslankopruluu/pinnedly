import OpenAI from 'openai';
import { defineSecret } from 'firebase-functions/params';
import { RankedItem, WorkspaceContext, formatContextForPrompt } from './contextBuilder';

export const openaiApiKey = defineSecret('OPENAI_API_KEY');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiWorkspaceResponse {
  answer: string;
  citedItems?: { type: RankedItem['type']; id: string; title: string }[];
}

const SYSTEM_PROMPT = `You are Draft's private workspace assistant.
Answer ONLY using the provided workspace STATS and ITEMS context about the user's notes, bookmarks, projects, and todos.
If the user asks unrelated general-knowledge questions, briefly refuse and suggest workspace questions they can ask.
Be concise, friendly, and practical. Respond in the same language the user writes in.
Never invent items that are not in the context.`;

export async function generateWorkspaceAnswer(
  apiKey: string,
  message: string,
  context: WorkspaceContext,
  conversation: ChatMessage[] = []
): Promise<AiWorkspaceResponse> {
  const client = new OpenAI({ apiKey });
  const contextBlock = formatContextForPrompt(context);

  const history = conversation.slice(-6).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      {
        role: 'user',
        content: `[Workspace context]\n${contextBlock}\n\n[Question]\n${message}`,
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim() || '';
  const citedItems = context.items.slice(0, 5).map((item) => ({
    type: item.type,
    id: item.id,
    title: item.title,
  }));

  return { answer, citedItems };
}