export type Plan = 'free' | 'premium';

export type EntitlementStatus =
  | 'loading'
  | 'free'
  | 'active'
  | 'grace'
  | 'expired'
  | 'error';

export type LimitedResource = 'bookmarks' | 'notes' | 'todos' | 'projects' | 'bookmarkLists';

export type FeatureKey =
  | 'ai'
  | 'kanban'
  | 'projectGallery'
  | 'projectTaskCreate'
  | 'sharing'
  | 'memberManagement'
  | 'advancedReminders'
  | 'bookmarkDigest'
  | 'dataExport';

export const FREE_USAGE_LIMITS: Readonly<Record<LimitedResource, number>> = {
  bookmarks: 30,
  notes: 10,
  todos: 20,
  projects: 2,
  bookmarkLists: 1,
};

export const PREMIUM_FEATURES: ReadonlySet<FeatureKey> = new Set([
  'kanban',
  'projectGallery',
  'projectTaskCreate',
  'sharing',
  'memberManagement',
  'advancedReminders',
  'bookmarkDigest',
  'dataExport',
]);

export interface EntitlementSnapshot {
  plan: Plan;
  status: EntitlementStatus;
  entitlementId?: string;
  productId?: string;
  expiresAt?: number;
  verifiedAt?: number;
  aiUsed: number;
  aiLimit: number;
}

export interface AccessContext {
  resource?: LimitedResource;
  usage?: number;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: 'premium_required' | 'limit_reached' | 'ai_quota_exhausted' | 'entitlement_unavailable';
  current?: number;
  limit?: number;
}

export function getAccessDecision(
  snapshot: EntitlementSnapshot,
  feature: FeatureKey | 'create',
  context: AccessContext = {}
): AccessDecision {
  if (snapshot.status === 'loading') {
    return { allowed: false, reason: 'entitlement_unavailable' };
  }

  if (feature === 'create') {
    if (snapshot.plan === 'premium') return { allowed: true };
    if (!context.resource || context.usage === undefined) return { allowed: true };
    const limit = FREE_USAGE_LIMITS[context.resource];
    return context.usage < limit
      ? { allowed: true, current: context.usage, limit }
      : { allowed: false, reason: 'limit_reached', current: context.usage, limit };
  }

  if (feature === 'ai') {
    return snapshot.aiUsed < snapshot.aiLimit
      ? { allowed: true, current: snapshot.aiUsed, limit: snapshot.aiLimit }
      : {
          allowed: false,
          reason: snapshot.plan === 'premium' ? 'ai_quota_exhausted' : 'premium_required',
          current: snapshot.aiUsed,
          limit: snapshot.aiLimit,
        };
  }

  if (snapshot.plan === 'premium') return { allowed: true };
  return PREMIUM_FEATURES.has(feature)
    ? { allowed: false, reason: 'premium_required' }
    : { allowed: true };
}
