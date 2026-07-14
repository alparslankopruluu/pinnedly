# Draft UI localization audit

Date: 2026-07-12

## Outcome

The app language switch works. Mixed-language screenshots are caused by incomplete locale resources and by user-created test data that is not localization-managed.

## Key parity and untranslated values

The English file is the source schema. “English values” excludes obvious proper nouns such as Draft, LinkedIn, Twitter, Medium and Kanban.

| Locale | Missing keys | Values identical to English | Screenshot-critical English values |
|---|---:|---:|---:|
| Turkish | 0 | 8 | 4 (proper nouns/terms) |
| Arabic | 46 | 187 | 88 |
| Russian | 46 | 187 | 88 |
| German | 46 | 123 | 76 |
| Portuguese | 46 | 118 | 73 |
| Spanish | 46 | 119 | 72 |
| Italian | 46 | 120 | 73 |
| Japanese | 46 | 112 | 71 |
| Simplified Chinese | 46 | 112 | 71 |

## Blocks causing the supplied Arabic screenshot

- `projectDetail.progress`, `members`, `nudgeMe`
- `projectDetail.tabs.tasks`, `timeline`, `gallery`
- `projectDetail.deadline.*`
- `projectDetail.swipeHint`
- Most of `projectMembers.*`
- Most of `projectCard.*`
- Several `projects.addTask.*` values

These values are English in `locales/ar.json`, so i18next is returning exactly what the locale file contains. This is not a language-switch failure.

## Missing in every non-Turkish locale

The same 46 keys are absent from Arabic, Russian, German, Portuguese, Spanish, Italian, Japanese and Chinese. They cover:

- edit-profile navigation and the complete edit-profile form
- collaboration/settings entries
- share inbox/discover lists
- AI error messages
- invite acceptance states
- link-sharing tabs and actions
- list visibility labels

## User content versus UI copy

The following screenshot strings are stored project/task data and will not change when the locale changes:

- `Note proje`
- `Proje açıklamas`
- `Todo proje development`
- `Todo`

For App Store artwork these should be replaced with culturally appropriate sample data in a non-destructive image-compositing step, or seeded separately per screenshot locale.

## Code review

The affected project screens correctly call `t(...)`; the primary defect is resource quality, not hard-coded JSX copy. The locale files should be brought to key parity and reviewed by native speakers before release. A CI check should fail when a locale is missing a source key or retains an unintended English source value.

## Screenshot recommendation

Use the already captured real UI as the base and replace only text regions with deterministic layers. This preserves layout, images, shadows and device rendering while allowing localized UI labels and localized sample project/task content without taking 50 separate simulator screenshots.
