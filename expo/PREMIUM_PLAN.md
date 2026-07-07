# Premium Plan

## Summary

Draft should launch with two customer-facing tiers: **Free** and **Premium**. Keep any internal `premium+` type reserved for the future, but do not expose it in v1. The product message should stay simple: Free is a useful personal workspace with limits; Premium unlocks unlimited workspace, AI, collaboration, smart reminders, digest, voice notes, and exports.

## Pricing And Trial

- Monthly: `$9.99/month`
- Yearly: `$79.99/year`
- Trial: 7 days free, then the selected plan renews automatically.
- Default selected plan: Yearly.
- Trial grants the full Premium entitlement.
- After trial expiration, Premium features turn off, but existing user data remains readable, editable, exportable where already allowed, and deletable.

## Free vs Premium

| Capability | Free | Premium |
| --- | --- | --- |
| Bookmarks | 50 saved bookmarks | Unlimited |
| Notes | 20 notes | Unlimited |
| Projects | 3 projects | Unlimited |
| Todos | Unlimited basic todos | Unlimited plus advanced reminder flows |
| Bookmark lists | 2 private lists | Unlimited private/shared/public lists |
| Workspace AI assistant | 5 lifetime questions | 300 questions/month fair-use |
| Smart bookmark digest | Not included | Daily/weekly digest |
| Reminders | Basic one-time reminder | Recurring smart reminders |
| Collaboration | Can view invited shared content | Can create shares and manage view/edit roles |
| Voice notes | Not included | Voice note recording and transcription |
| Export | Not included | Markdown/PDF/CSV export |
| Themes | Basic appearance | Premium themes |
| Support | Standard | Priority support |

## Premium Must-Haves

1. Workspace AI Assistant: this is the main paid value. Free users get 5 lifetime questions, then hit the paywall.
2. Unlimited workspace: enforce creation limits for bookmarks, notes, projects, and lists.
3. Smart reminders and bookmark digest: retention-driving features that justify subscription value.
4. Collaboration ownership: free users can open invitations; Premium users can create shares and assign permissions.
5. Voice notes and transcription: paid because it has operating cost and clear user value.
6. Export and backup: paid power-user feature.

## What Must Stay Free

- Manual bookmark, note, project, and todo creation within free limits.
- Share extension save flow within free limits.
- Offline usage.
- Viewing content shared by another user.
- Reading, editing, and deleting existing content, even if the account is above the current free limit after a downgrade.

Do not lock existing user data behind the paywall. If a downgraded or free user is above a limit, block only new creation of that limited object until they upgrade or reduce usage.

## Paywall Triggers

- User sends the 6th lifetime AI assistant question.
- User tries to create the 51st bookmark.
- User tries to create the 21st note.
- User tries to create the 4th project.
- User tries to create the 3rd bookmark list.
- User taps collaborator invite or permission management.
- User enables smart reminder, recurring reminder, or bookmark digest.
- User taps voice note, transcription, export, or premium theme.
- Profile and Settings can show a passive upgrade CTA, but the app should not open paywall on launch.

## Entitlement Model

Use one customer-facing entitlement:

```ts
type Plan = 'free' | 'premium';
type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'expired' | 'cancelled';
```

Recommended account fields:

- `plan`
- `subscriptionStatus`
- `trialStartedAt`
- `trialEndsAt`
- `subscriptionProvider`
- `subscriptionProductId`
- `currentPeriodEndsAt`
- `aiQuestionsUsedThisMonth`
- `aiQuotaMonth`
- `limitsOverride` for admin/testing only

Recommended derived helper:

```ts
isPremium = subscriptionStatus === 'trialing' || subscriptionStatus === 'active';
```

## Limit Defaults

```ts
const FREE_LIMITS = {
  bookmarks: 50,
  notes: 20,
  projects: 3,
  bookmarkLists: 2,
  aiLifetimeQuestions: 5,
};

const PREMIUM_LIMITS = {
  bookmarks: Infinity,
  notes: Infinity,
  projects: Infinity,
  bookmarkLists: Infinity,
  aiMonthlyQuestions: 300,
};
```

Use server-side checks for anything that costs money or affects shared state: AI requests, transcription, collaboration creation, and exports. Client-side checks are still useful for fast UX, but they should not be the source of truth.

## Rollout Plan

1. Add entitlement state and limit helpers.
2. Gate AI assistant with free lifetime count and monthly Premium quota.
3. Gate creation limits for bookmarks, notes, projects, and bookmark lists.
4. Gate collaboration creation, smart reminders, digest, voice notes, and exports.
5. Replace mock Premium modal completion with real purchase flow.
6. Add subscription analytics events: paywall viewed, trial started, purchase completed, purchase failed, restore completed, entitlement refreshed, limit reached.
7. Add downgrade handling so existing over-limit data stays accessible.

## Future Premium+

Do not launch Premium+ in v1. Consider it only after there is demand for higher-cost features:

- Higher AI quota or longer workspace context.
- Team administration.
- OCR or bulk import.
- API access.
- Advanced analytics.

## Platform Notes

- Apple auto-renewable subscriptions must clearly describe the paid service, renewal behavior, price, and trial terms.
- Apple introductory offers can be used for free trials.
- Google Play subscriptions should be modeled with subscription products, base plans, and offers.
- Keep all paywall copy explicit: "7-day free trial, then $9.99/month" or "7-day free trial, then $79.99/year."

References:

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple introductory offers: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/
- Google Play subscriptions: https://developer.android.com/google/play/billing/subscriptions
