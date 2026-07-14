# Subscription production setup

The app never embeds a RevenueCat secret API key. Before deploying, revoke the secret key that was previously shared in chat and create a replacement only if it is still needed for dashboard/API administration.

## Firebase Functions secrets

Set the following with Firebase Secret Manager:

```sh
firebase functions:secrets:set REVENUECAT_API_KEY
firebase functions:secrets:set REVENUECAT_WEBHOOK_AUTH
firebase functions:secrets:set REVENUECAT_WEBHOOK_HMAC
firebase functions:secrets:set OPENAI_API_KEY
```

- `REVENUECAT_API_KEY`: the Draft App Store SDK key used by RevenueCat API v1 customer lookup. Although this key is public by RevenueCat design, it is kept server-side for one configuration path.
- `REVENUECAT_WEBHOOK_AUTH`: the complete Authorization header configured on the RevenueCat webhook, for example `Bearer <random-value>`.
- `REVENUECAT_WEBHOOK_HMAC`: the signing secret shown when HMAC signing is enabled.

## RevenueCat webhook

When the RevenueCat plan includes webhooks, configure:

- URL: `https://europe-west1-pinnedly-48c49.cloudfunctions.net/revenueCatWebhook`
- Environment: production and sandbox while testing; production only after release validation
- Authorization header: exactly the same value stored in `REVENUECAT_WEBHOOK_AUTH`
- HMAC signing: enabled, with its secret stored in `REVENUECAT_WEBHOOK_HMAC`

The REST check remains authoritative, so purchases and restores work even when webhook delivery is delayed.

## Deployment order

1. Install JDK 21 or newer and run the Firestore emulator tests/check.
2. Deploy Functions, including `syncEntitlement`, `mutateContent`, `deleteAccount`, and the AI/share handlers.
3. Deploy `firestore.rules` only after the Functions are live; the rules intentionally reject direct client creates/deletes for limited content.
4. Configure and test the webhook.
5. Run a RevenueCat sandbox purchase, restore, cancellation/expiration, Free-limit, collaboration, and AI-quota pass.
6. Build the production archive only after the sandbox pass succeeds.
