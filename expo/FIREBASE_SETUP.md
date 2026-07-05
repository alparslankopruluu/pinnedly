# Firebase Setup — Pinnedly

Project: **pinnedly-48c49** (number: `36179904713`)  
Bundle ID (iOS) / Package (Android): `app.techtactoe.pinnedly`

## 1. Register apps in Firebase Console

Open [Firebase Console](https://console.firebase.google.com/u/0/project/pinnedly-48c49/overview).

### Android
1. Project settings → Add app → Android
2. Package name: `app.techtactoe.pinnedly`
3. Download `google-services.json` → place at `expo/google-services.json`

### iOS
1. Project settings → Add app → iOS
2. Bundle ID: `app.techtactoe.pinnedly`
3. Download `GoogleService-Info.plist` → place at `expo/GoogleService-Info.plist`

## 2. Enable Authentication

Firebase Console → Authentication → Sign-in method:

- **Email/Password** — Enable
- **Google** — Enable, add support email
- **Phone** — Enable (Blaze plan required for production SMS)

### Google Sign-In extras

1. Copy **Web client ID** from Firebase → Project settings → Your apps → Web app (create if missing)
2. Set in `app.json` → `extra.googleWebClientId` (configured: Web client from `google-services.json`)
3. From `GoogleService-Info.plist`, copy `REVERSED_CLIENT_ID` into `app.json` → Google Sign-In plugin `iosUrlScheme` (configured)

### Auth providers enabled
- Email/Password
- Google
- Apple (iOS)
- Phone (`app/(auth)/phone-sign-in.tsx`)

### Android SHA fingerprints (debug)

**Important:** This project signs debug builds with `android/app/debug.keystore` (Expo/RN default), **not** `~/.android/debug.keystore`. Google Sign-In `DEVELOPER_ERROR` means the signing SHA-1 is missing in Firebase.

```bash
# Project debug keystore (used by expo run:android)
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Optional: machine default keystore (only if you change signing config)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Add SHA-1 and SHA-256 in Firebase → Project settings → Your Android app.

Project debug keystore (`android/app/debug.keystore`):

- SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- SHA-256: `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`

Release / Play Store upload keystore (`release.keystore`):

- SHA-1: `68:F6:48:96:5D:CA:0F:05:B4:4A:52:A2:9C:B0:91:2E:AA:D4:86:52`
- SHA-256: `78:46:D7:1F:AB:A1:03:5A:E3:06:4C:19:69:19:E6:DD:42:03:3C:04:D2:83:E1:80:92:22:7B:87:38:6A:5F:5E`

Print current fingerprints anytime:

```bash
./scripts/print-android-sha.sh
```

### Release signing setup

1. Create `credentials.json` at project root (gitignored):

```json
{
  "android": {
    "keystore": {
      "keystorePath": "release.keystore",
      "keystorePassword": "YOUR_KEYSTORE_PASSWORD",
      "keyAlias": "pinnedly-release",
      "keyPassword": "YOUR_KEY_PASSWORD"
    }
  }
}
```

2. Keep `release.keystore` backed up securely — losing it blocks Play Store updates
3. Release builds use `signingConfigs.release` via `plugins/withAndroidReleaseSigning.js`

### Google Play App Signing (after store listing)

Play Console re-signs the app with Google's key. After enabling Play App Signing, also add the **App signing key certificate** SHA-1 from:

Play Console → Setup → App signing → App signing key certificate

Without that SHA-1 in Firebase, Google Sign-In can fail in production even if the upload key is registered.

## 3. Firestore

1. Create database (production mode)
2. Deploy rules from this repo:

```bash
cd expo
firebase login
firebase use pinnedly-48c49
firebase deploy --only firestore:rules
```

Rules file: `expo/firestore.rules`

Offline persistence is enabled in `lib/firestore.ts`.

## 4. Analytics & Crashlytics

- **Analytics**: screen views (`AnalyticsProvider`), button presses (`button_press`), auth events (`login`, `sign_up`, `logout`), entity events (`note_*`, `bookmark_*`, `project_*`, `todo_*`)
- **Crashlytics**: Gradle plugin `3.0.7` applied via `@react-native-firebase/crashlytics` Expo plugin; errors in `ErrorBoundary`
- **Test crash** (dev builds only): Settings → Developer → Test Crash

Debug Analytics on device:

```bash
# Android
adb shell setprop debug.firebase.analytics.app app.techtactoe.pinnedly

# iOS — add -FIRAnalyticsDebugEnabled to Xcode scheme
```

## 5. Local dev build (required — Expo Go does not support RN Firebase)

```bash
cd expo
# Download from Firebase Console, or:
firebase apps:sdkconfig ANDROID 1:36179904713:android:199543591a06b2ab57e518 --project pinnedly-48c49 > google-services.json
# iOS: download GoogleService-Info.plist from Firebase Console → expo/GoogleService-Info.plist

# Update app.json extra.googleWebClientId and iosUrlScheme

bun install
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

## 6. Config files (do not commit secrets)

Add to `.gitignore` if not already:

```
google-services.json
GoogleService-Info.plist
```

Use `.example` files as templates.