import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { buildWorkspaceContext } from './contextBuilder';
import { ChatMessage, generateWorkspaceAnswer, openaiApiKey } from './openai';
import { reserveAiUsage, revenueCatApiKey } from './subscription';

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

function sendError(
  res: { status: (status: number) => { json: (body: unknown) => void } },
  status: number,
  code: string,
  error: string,
  requestId: string
) {
  res.status(status).json({ error, code, requestId });
}

export const aiWorkspaceChat = onRequest(
  { secrets: [openaiApiKey, revenueCatApiKey], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    const requestId = randomUUID();
    setCors(res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', requestId);
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 401, 'AUTH_REQUIRED', 'Missing authorization token', requestId);
      return;
    }

    let uid: string | undefined;
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      if (decoded.firebase?.sign_in_provider === 'anonymous') {
        sendError(res, 403, 'SIGN_IN_REQUIRED', 'A registered account is required', requestId);
        return;
      }
      uid = decoded.uid;
    } catch {
      sendError(res, 401, 'AUTH_REQUIRED', 'Invalid authorization token', requestId);
      return;
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      sendError(res, 400, 'MESSAGE_REQUIRED', 'Message is required', requestId);
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

    let releaseAiUsage: (() => Promise<void>) | undefined;
    try {
      const reservation = await reserveAiUsage(uid);
      releaseAiUsage = reservation.release;
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
      if (releaseAiUsage) await releaseAiUsage().catch(() => undefined);
      const entitlementCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : undefined;
      if (entitlementCode === 'PREMIUM_REQUIRED' || entitlementCode === 'AI_QUOTA_EXHAUSTED') {
        sendError(
          res,
          entitlementCode === 'PREMIUM_REQUIRED' ? 402 : 429,
          entitlementCode,
          entitlementCode === 'PREMIUM_REQUIRED' ? 'Premium required' : 'AI quota exhausted',
          requestId
        );
        return;
      }
      console.error('aiWorkspaceChat failed:', {
        requestId,
        uid,
        messageLength: message.length,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      sendError(
        res,
        500,
        'WORKSPACE_ANSWER_FAILED',
        'Failed to generate workspace answer',
        requestId
      );
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

export { syncEntitlement, revenueCatWebhook } from './subscription';
export { mutateContent, deleteAccount } from './contentAccess';
