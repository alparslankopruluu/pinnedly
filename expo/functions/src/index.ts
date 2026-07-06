import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { buildWorkspaceContext } from './contextBuilder';
import { ChatMessage, generateWorkspaceAnswer, openaiApiKey } from './openai';

admin.initializeApp();

const EMPTY_WORKSPACE_ANSWERS: Record<string, string> = {
  tr: 'Henüz kayıtlı içerik yok. Not, proje, yer imi veya yapılacak ekledikten sonra ilerleme ve özet sorularını sorabilirsin.',
  en: 'You do not have any saved workspace content yet. Add notes, projects, bookmarks, or todos, then ask about your progress and summaries.',
};

function detectLanguage(message: string): 'tr' | 'en' {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(message) ? 'tr' : 'en';
}

function setCors(res: { set: (key: string, value: string) => void }) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

export const aiWorkspaceChat = onRequest(
  { secrets: [openaiApiKey], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    setCors(res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: 'Invalid authorization token' });
      return;
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const conversation = Array.isArray(req.body?.conversation)
      ? (req.body.conversation as ChatMessage[]).filter(
          (entry) =>
            entry &&
            (entry.role === 'user' || entry.role === 'assistant') &&
            typeof entry.content === 'string'
        )
      : [];

    try {
      const context = await buildWorkspaceContext(admin.firestore(), uid, message);

      if (context.isEmpty) {
        const lang = detectLanguage(message);
        res.status(200).json({ answer: EMPTY_WORKSPACE_ANSWERS[lang], citedItems: [] });
        return;
      }

      const result = await generateWorkspaceAnswer(
        openaiApiKey.value(),
        message,
        context,
        conversation
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('aiWorkspaceChat failed:', error);
      res.status(500).json({ error: 'Failed to generate workspace answer' });
    }
  }
);

export {
  acceptInvite,
  createInvite,
  removeProjectMember,
  revokeShare,
  shareEntityWithHandle,
  updateProfile,
  updateProjectMemberPermission,
  updateSharePermission,
} from './shareHandlers';
