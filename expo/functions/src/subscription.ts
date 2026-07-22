import * as admin from 'firebase-admin';
import { createHmac, timingSafeEqual } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

export const revenueCatApiKey = defineSecret('REVENUECAT_API_KEY');
export const revenueCatWebhookAuth = defineSecret('REVENUECAT_WEBHOOK_AUTH');
export const revenueCatWebhookHmac = defineSecret('REVENUECAT_WEBHOOK_HMAC');

export const REVENUECAT_ENTITLEMENT_ID = 'draft Pro';
export const FREE_AI_LIMIT = 3;
export const PREMIUM_AI_LIMIT = 100;
const REGION = 'europe-west1';
const CACHE_TTL_MS = 5 * 60 * 1000;

export type SubscriptionStatus = 'free' | 'active' | 'grace' | 'expired' | 'error';

export interface ServerEntitlement {
  plan: 'free' | 'premium';
  status: SubscriptionStatus;
  active: boolean;
  entitlementId?: string;
  productId?: string;
  expiresAt?: number;
  verifiedAt: number;
  aiUsed: number;
  aiLimit: number;
}

type RevenueCatSubscriber = {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        expires_date?: string | null;
        product_identifier?: string;
      }
    >;
    subscriptions?: Record<
      string,
      {
        billing_issues_detected_at?: string | null;
      }
    >;
  };
};

function utcMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getAiUsage(uid: string, premium: boolean): Promise<number> {
  const snap = await admin.firestore().collection('subscriptionUsage').doc(uid).get();
  if (!snap.exists) return 0;
  const data = snap.data() ?? {};
  if (!premium) return Number(data.freeAiUsed ?? 0);
  return data.aiMonth === utcMonthKey() ? Number(data.monthlyAiUsed ?? 0) : 0;
}

function parseExpiration(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function fetchRevenueCatEntitlement(uid: string): Promise<ServerEntitlement> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
    {
      headers: {
        Authorization: `Bearer ${revenueCatApiKey.value()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`RevenueCat customer lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as RevenueCatSubscriber;
  const entitlement = payload.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];
  const expiresAt = parseExpiration(entitlement?.expires_date);
  const productId = entitlement?.product_identifier;
  const active = Boolean(entitlement && (!expiresAt || expiresAt > Date.now()));
  const hasBillingIssue = Boolean(
    productId && payload.subscriber?.subscriptions?.[productId]?.billing_issues_detected_at
  );
  const plan = active ? 'premium' : 'free';
  const status: SubscriptionStatus = active
    ? hasBillingIssue
      ? 'grace'
      : 'active'
    : entitlement
      ? 'expired'
      : 'free';
  const verifiedAt = Date.now();
  const aiUsed = await getAiUsage(uid, active);

  const result: ServerEntitlement = {
    plan,
    status,
    active,
    entitlementId: entitlement ? REVENUECAT_ENTITLEMENT_ID : undefined,
    productId,
    expiresAt,
    verifiedAt,
    aiUsed,
    aiLimit: active ? PREMIUM_AI_LIMIT : FREE_AI_LIMIT,
  };

  // Firestore rejects `undefined`. A free subscriber has no entitlement or
  // product identifier, so only persist those optional values when present.
  const entitlementRecord: Record<string, unknown> = {
    plan: result.plan,
    status: result.status,
    active: result.active,
    verifiedAt: result.verifiedAt,
    aiUsed: result.aiUsed,
    aiLimit: result.aiLimit,
    expiresAtServer: expiresAt ? admin.firestore.Timestamp.fromMillis(expiresAt) : null,
  };
  if (result.entitlementId) entitlementRecord.entitlementId = result.entitlementId;
  if (result.productId) entitlementRecord.productId = result.productId;
  if (result.expiresAt) entitlementRecord.expiresAt = result.expiresAt;

  await admin.firestore().collection('subscriptionEntitlements').doc(uid).set(
    entitlementRecord,
    { merge: true }
  );
  return result;
}

export async function getAuthoritativeEntitlement(
  uid: string,
  forceRefresh = false
): Promise<ServerEntitlement> {
  if (!forceRefresh) {
    const cached = await admin.firestore().collection('subscriptionEntitlements').doc(uid).get();
    if (cached.exists) {
      const data = cached.data() as ServerEntitlement;
      const fresh = Date.now() - Number(data.verifiedAt ?? 0) < CACHE_TTL_MS;
      const notExpired = !data.expiresAt || data.expiresAt > Date.now();
      if (fresh && (!data.active || notExpired)) {
        const aiUsed = await getAiUsage(uid, data.active);
        return { ...data, aiUsed, aiLimit: data.active ? PREMIUM_AI_LIMIT : FREE_AI_LIMIT };
      }
    }
  }
  return fetchRevenueCatEntitlement(uid);
}

export async function reserveAiUsage(uid: string): Promise<{
  entitlement: ServerEntitlement;
  release: () => Promise<void>;
}> {
  const entitlement = await getAuthoritativeEntitlement(uid);
  const usageRef = admin.firestore().collection('subscriptionUsage').doc(uid);
  const month = utcMonthKey();
  const field = entitlement.active ? 'monthlyAiUsed' : 'freeAiUsed';
  const limit = entitlement.active ? PREMIUM_AI_LIMIT : FREE_AI_LIMIT;

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const data = snap.data() ?? {};
    const used = entitlement.active
      ? data.aiMonth === month
        ? Number(data.monthlyAiUsed ?? 0)
        : 0
      : Number(data.freeAiUsed ?? 0);
    if (used >= limit) {
      const error = new Error(entitlement.active ? 'AI quota exhausted' : 'Premium required');
      (error as Error & { code?: string }).code = entitlement.active
        ? 'AI_QUOTA_EXHAUSTED'
        : 'PREMIUM_REQUIRED';
      throw error;
    }

    tx.set(
      usageRef,
      entitlement.active
        ? { aiMonth: month, monthlyAiUsed: used + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
        : { freeAiUsed: used + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  return {
    entitlement: { ...entitlement, aiUsed: entitlement.aiUsed + 1 },
    release: async () => {
      await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(usageRef);
        if (!snap.exists) return;
        const data = snap.data() ?? {};
        if (entitlement.active && data.aiMonth !== month) return;
        const current = Number(data[field] ?? 0);
        tx.update(usageRef, { [field]: Math.max(0, current - 1) });
      });
    },
  };
}

async function requireFirebaseUser(req: { headers: { authorization?: string } }): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new Error('AUTH_REQUIRED');
  const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
  if (decoded.firebase?.sign_in_provider === 'anonymous') throw new Error('SIGN_IN_REQUIRED');
  return decoded.uid;
}

export const syncEntitlement = onRequest(
  { region: REGION, secrets: [revenueCatApiKey], cors: true, timeoutSeconds: 20 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' });
      return;
    }
    try {
      const uid = await requireFirebaseUser(req);
      res.status(200).json(await getAuthoritativeEntitlement(uid, true));
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : '';
      const authError = errorCode === 'AUTH_REQUIRED';
      const signInRequired = errorCode === 'SIGN_IN_REQUIRED';
      res.status(authError ? 401 : signInRequired ? 403 : 503).json({
        code: signInRequired ? 'SIGN_IN_REQUIRED' : authError ? 'AUTH_REQUIRED' : 'ENTITLEMENT_UNAVAILABLE',
        error: signInRequired
          ? 'A registered account is required'
          : authError
            ? 'Authentication required'
            : 'Subscription status could not be verified',
      });
    }
  }
);

function validHmac(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const separator = part.indexOf('=');
      return [part.slice(0, separator), part.slice(separator + 1)];
    })
  );
  const timestamp = Number(parts.t);
  const actual = parts.v1;
  if (!actual || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return false;
  }
  const expected = createHmac('sha256', revenueCatWebhookHmac.value())
    .update(`${parts.t}.`)
    .update(rawBody)
    .digest('hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export const revenueCatWebhook = onRequest(
  {
    region: REGION,
    secrets: [revenueCatApiKey, revenueCatWebhookAuth, revenueCatWebhookHmac],
    timeoutSeconds: 20,
  },
  async (req, res) => {
    const authorized = req.headers.authorization === revenueCatWebhookAuth.value();
    const signature = req.headers['x-revenuecat-webhook-signature'];
    const signed = validHmac(
      req.rawBody,
      Array.isArray(signature) ? signature[0] : signature
    );
    if (!authorized || !signed) {
      res.status(401).json({ code: 'INVALID_WEBHOOK', error: 'Invalid webhook authorization' });
      return;
    }

    const event = req.body?.event as { id?: string; app_user_id?: string } | undefined;
    if (!event?.id || !event.app_user_id) {
      res.status(400).json({ code: 'INVALID_EVENT', error: 'Invalid webhook event' });
      return;
    }

    const eventRef = admin.firestore().collection('revenueCatWebhookEvents').doc(event.id);
    const alreadyHandled = await admin.firestore().runTransaction(async (tx) => {
      const existing = await tx.get(eventRef);
      if (existing.exists) return true;
      tx.create(eventRef, {
        appUserId: event.app_user_id,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return false;
    });
    if (!alreadyHandled) await fetchRevenueCatEntitlement(event.app_user_id);
    res.status(200).json({ ok: true });
  }
);
