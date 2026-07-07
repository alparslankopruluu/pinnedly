# Platform Readiness Plan

## Summary

Draft targets Android, iOS, web, and desktop browser/PWA as the first cross-platform release path. Native Mac and Windows shells are deferred until the web/PWA surface is stable.

The implementation keeps RNFirebase on native and adds web-safe Firebase/Auth adapters for browser runtime. Native-only capabilities such as Crashlytics, share intent, haptics, push notifications, and Apple Sign-In now run behind capability checks so web does not load unsupported native modules.

## Implementation Changes

- Web/PWA: Expo web uses Metro static output, responsive orientation is enabled, and Firebase web config is available through `extra.firebaseWeb`.
- Platform services: Auth, Firestore, function token calls, analytics, crashlytics, notifications, share intent, and haptics route through web/native capability wrappers.
- Responsive UI: onboarding uses `useWindowDimensions`; project detail constrains wide content and sizes gallery grids by breakpoint; projects/Kanban adapts list width, modal width, and board column width for desktop/tablet/mobile.
- Tests: `test:web:responsive` exports web and runs a viewport smoke test against the static build.

## Test Scenarios

- `npm run typecheck`
- `npm run lint`
- `npm run web:export`
- `npm run test:web:responsive`

Responsive smoke viewports:

- Mobile web: `390x844`
- Tablet: `768x1024`
- Laptop: `1280x800`
- Desktop: `1440x900`

Acceptance checks:

- First meaningful screen renders and is not blank.
- No framework error overlay is visible.
- No relevant browser console errors are emitted.
- Main document does not create horizontal overflow.
- At least one visible button/link/interactive control exists on the landing route.

## Assumptions

- MacBook and Windows v1 ship as responsive web/PWA, not native desktop apps.
- Electron/Tauri packaging can be added after web runtime and responsive QA pass.
- React Native macOS/Windows is a separate larger project because it requires new native platform setup and compatibility work.
- Firebase web Auth/Firestore are the browser data layer; RNFirebase remains the native data layer.
