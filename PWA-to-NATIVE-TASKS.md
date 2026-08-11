# Angelus: PWA to Native Release Tasks

## Purpose

This document is an execution plan for turning the existing Angelus progressive web app into production-quality Android and iOS applications while preserving `https://angelus.live/` as the web version.

The recommended architecture is Capacitor wrapped around the existing dependency-free HTML, CSS, and JavaScript application. Shared prayer, calendar, presentation, history, and theme logic should remain platform-neutral. Native integrations should be introduced through small adapters rather than scattered platform checks.

The plan is written for agentic implementation. Each task has a bounded scope, dependencies, deliverables, acceptance criteria, and verification commands or checks. An agent should complete only one task or one explicitly assigned task group at a time.

## Product Outcomes

The completed project must provide:

- The existing installable PWA at `angelus.live`.
- A signed Android application distributed through Google Play.
- A signed iOS application distributed through the Apple App Store.
- Reliable, user-configurable local reminders at 6:00, 12:00, and 18:00.
- Correct Angelus, Regina Caeli, seasonal, and Triduum notification behaviour.
- Fully offline prayer access in all three applications.
- Private, on-device preferences and prayer history.
- Notification deep links that open the relevant prayer context.
- Accessible, store-quality native presentation.
- A repeatable build, test, versioning, and release process.

## Existing Baseline

The current repository is a no-build PWA on the `main` branch with:

- `index.html` as the application shell.
- `app.js` for state, rendering, and event wiring.
- `prayers.js` for prayer texts and liturgical-season calculations.
- `streaks.js` for prayer history and streaks.
- `notifications.js` for web notifications and session alarms.
- `audio.js` for Web Speech API narration.
- `sw.js` for offline caching and periodic background sync.
- `manifest.json` and icon assets for PWA installation.
- `localStorage` keys for mode, theme, streak, history, and notification settings.

The native conversion must begin from this working baseline and avoid a framework rewrite.

## Target Architecture

```text
Shared application
├── prayer texts and liturgical calendar
├── rendering and interaction
├── history and streak domain logic
├── themes and typography
└── platform-neutral interfaces
    ├── storage adapter
    ├── notification adapter
    ├── lifecycle adapter
    └── audio adapter

Platform implementations
├── Web: localStorage, service worker, Web Notifications, Web Speech
├── Android: Capacitor Preferences, Local Notifications, app lifecycle
└── iOS: Capacitor Preferences, Local Notifications, app lifecycle
```

Native applications bundle the web assets. They must not depend on a live web connection to start or pray.

## Agent Operating Rules

Before starting a task, an agent must:

1. Read this document, `README.md`, and all files named in the task.
2. Inspect the current branch and working tree; preserve unrelated user changes.
3. Confirm that all dependency tasks are complete in the current code, not merely checked off here.
4. Record assumptions in the pull request or handoff when product decisions remain unresolved.
5. Use the current supported stable versions of Capacitor and its official plugins unless the repository pins a compatible version.
6. Keep commits task-scoped and update tests or documentation with the implementation.
7. Never add analytics, advertising, accounts, remote storage, or tracking without explicit approval.

An agent must stop and request a human decision if a task requires:

- Apple or Google account ownership, legal declarations, contracts, or payment.
- Production signing credentials, certificates, provisioning profiles, or secret values.
- A change to authoritative prayer text or liturgical rules.
- A privacy-affecting service or new collection of personal data.
- A store-policy interpretation that materially changes the product.
- Destructive modification of existing release configuration or user data.

## Definition of Done for Every Task

A task is complete only when:

- Its deliverables exist and are narrowly scoped.
- Its acceptance criteria pass.
- Relevant automated tests pass.
- Relevant manual checks are recorded.
- No secrets, machine-specific paths, build outputs, or signing files are committed.
- Documentation reflects any new setup or behaviour.
- The app still functions as a web PWA unless the task explicitly states otherwise.

---

# Phase 0: Baseline and Decisions

## NAT-001: Capture the Existing PWA Baseline

**Depends on:** none  
**Parallel-safe with:** NAT-002, NAT-003

### Work

- Run the PWA locally over `localhost`.
- Exercise Traditional, Contemporary, and Latin modes.
- Verify season selection, prayer completion, history, streaks, theme, narration, notification settings, and offline reload.
- Record current `localStorage` schemas and edge cases.
- Add a concise baseline test matrix under `docs/native/`.
- Capture reproducible defects separately; do not silently fold unrelated repairs into native setup.

### Deliverables

- `docs/native/BASELINE.md`
- A baseline test matrix with pass/fail status.
- Issues or clearly marked follow-ups for pre-existing defects.

### Acceptance

- Another agent can reproduce the current behaviour from the document.
- All five existing storage keys and their shapes are documented.
- The current offline and reminder limitations are explicitly described.

## NAT-002: Decide Application Identity and Ownership

**Depends on:** none  
**Human input required:** yes

### Work

Agree and document:

- Public application name and subtitle.
- Reverse-domain application identifier, used consistently for iOS and Android.
- Apple Developer and Google Play owner accounts.
- Copyright holder and support contact.
- Public support URL and privacy-policy URL.
- Initial supported OS versions and device classes.
- Whether tablets receive a deliberately adapted layout in version 1.

### Deliverable

- `docs/native/PRODUCT-DECISIONS.md`

### Acceptance

- Bundle/application identifiers are immutable and approved before native projects are generated.
- Store ownership and public contact details are unambiguous.
- No agent invents legal identity or account details.

## NAT-003: Establish Quality and Release Gates

**Depends on:** none  
**Parallel-safe with:** NAT-001, NAT-002

### Work

- Define supported Android API levels and iOS versions.
- Define browser support retained for the PWA.
- Define accessibility targets, including screen readers, text scaling, contrast, reduced motion, and touch targets.
- Define required test devices and simulators.
- Define blocking severity levels for release candidates.
- Decide whether Android and iOS may ship on different dates.

### Deliverable

- `docs/native/QUALITY-GATES.md`

### Acceptance

- Release-blocking criteria are objective.
- Physical-device notification testing is required for both platforms.
- Daylight-saving, timezone, restart, permission, and liturgical-boundary cases are included.

---

# Phase 1: Make the Web Code Native-Ready

## NAT-010: Add a Minimal Build and Test Toolchain

**Depends on:** NAT-001

### Work

- Introduce a minimal Node-based toolchain without adopting a UI framework.
- Add scripts for development, production build, tests, linting or static checks, and Capacitor asset sync.
- Make the production build emit a clean web asset directory such as `dist/`.
- Preserve the existing source modules and straightforward static hosting.
- Ensure service-worker registration and PWA metadata are enabled for web builds but do not interfere with native builds.
- Pin runtime requirements through `package.json` and, where appropriate, an engine file.

### Deliverables

- `package.json` and lockfile.
- Build configuration.
- Generated output excluded from version control unless the deployment system explicitly requires it.
- Updated local-development instructions.

### Acceptance

- A clean checkout can install dependencies, run tests, and produce `dist/`.
- The built web app works online and offline.
- Source cache-busting and service-worker asset paths remain correct.
- There is no dependency on a frontend framework.

## NAT-011: Extract Liturgical Domain Tests

**Depends on:** NAT-010  
**Parallel-safe with:** NAT-012

### Work

- Add deterministic tests for Easter calculation and every seasonal boundary.
- Cover Holy Thursday before and after 18:00, Good Friday, Holy Saturday, Easter Sunday, Pentecost, the day after Pentecost, Advent start, and Christmas Eve.
- Pass dates or clocks into domain functions rather than depending invisibly on the machine clock.
- Test labels and prayer selection independently from rendering.

### Deliverables

- Automated unit tests for `prayers.js` or extracted domain modules.
- Documented timezone assumptions.

### Acceptance

- Tests run without a browser UI.
- Tests include multiple years and at least one daylight-saving transition period.
- Liturgical calculations are shared by web and native notification planning.

## NAT-012: Introduce a Storage Interface

**Depends on:** NAT-010  
**Parallel-safe with:** NAT-011

### Work

- Define a small asynchronous storage interface for get, set, remove, and migration/version metadata.
- Implement a web adapter backed by `localStorage`.
- Refactor mode, theme, history, streak, and notification settings to use the interface.
- Define versioned, validated schemas and safe defaults for malformed data.
- Preserve all existing web-user data without requiring migration action.

### Suggested structure

```text
src/platform/storage/
├── index.js
├── web.js
└── schema.js
```

### Acceptance

- Existing `localStorage` data loads unchanged.
- Corrupt or partially missing values fail safely.
- Storage consumers no longer call `localStorage` directly.
- Unit tests cover round trips, defaults, and schema upgrades.

## NAT-013: Introduce a Notification Interface

**Depends on:** NAT-010, NAT-011

### Work

- Define platform-neutral operations for capability, permission state, permission request, schedule reconciliation, and cancellation.
- Move the current browser behaviour into a web adapter.
- Define a serializable notification plan as dated notification requests, not perpetual generic repeats.
- Generate plans from liturgical rules so Eastertide titles and Triduum silence are correct.
- Give each request a stable identifier and prayer-context payload.

### Suggested structure

```text
src/platform/notifications/
├── index.js
├── planner.js
└── web.js
```

### Acceptance

- Web reminder behaviour has no regression.
- Plan generation is deterministic for a supplied date, timezone, and enabled-hour set.
- A rolling plan excludes Triduum notifications and labels Eastertide reminders as Regina Caeli.
- Tests cover all combinations of enabled 6:00, 12:00, and 18:00 slots.

## NAT-014: Add App Lifecycle and Deep-Link Routing Interfaces

**Depends on:** NAT-010

### Work

- Define a single route or state representation for “open prayer now” and “open prayer for bell slot.”
- Make the web app accept equivalent URL parameters for testability.
- Add lifecycle hooks for foreground resume and timezone/date changes.
- On resume, recompute the current season and reconcile scheduled reminders.
- Keep the app single-page and lightweight.

### Acceptance

- A URL can open morning, midday, or evening prayer context without corrupting navigation.
- Repeated deep links are idempotent.
- Resuming after midnight refreshes liturgical state.
- Unknown or malformed links fall back to the normal home view.

## NAT-015: Add Data Export and Import

**Depends on:** NAT-012

### Work

- Define a versioned JSON export containing user preferences, prayer history, and streak data.
- Exclude secrets and device-specific permission state.
- Validate imported data before any write.
- Present an import preview and require confirmation before replacing or merging data.
- Decide and document conflict semantics.
- Make the feature available on web and native so PWA users can migrate voluntarily.

### Acceptance

- Export then import produces an equivalent supported state.
- Invalid, oversized, or future-version files are rejected safely.
- Cancellation leaves existing data untouched.
- Import cannot enable OS notification permission silently.

## NAT-016: Preserve and Test Web Delivery

**Depends on:** NAT-011 through NAT-015

### Work

- Update service-worker precaching for the new output layout.
- Ensure native-only code is absent from, or safely tree-shaken out of, the web path.
- Test installability and offline upgrades from the current deployed PWA.
- Document deployment and rollback.

### Acceptance

- `angelus.live` retains all existing user-facing features.
- Existing stored history survives the new deployment.
- Offline load succeeds after a fresh online visit.
- A stale service worker updates without an unrecoverable blank screen.

---

# Phase 2: Create the Native Shells

## NAT-020: Initialise Capacitor

**Depends on:** NAT-002, NAT-010, NAT-016

### Work

- Install and configure the current supported stable Capacitor core and CLI.
- Point `webDir` at the production web output.
- Add Android and iOS projects using the approved application identifier and name.
- Add commands for build, sync, open, and run.
- Configure native navigation to remain inside bundled local content.
- Do not allow arbitrary remote navigation inside the native shell.

### Deliverables

- Capacitor configuration.
- `android/` and `ios/` native projects.
- Setup documentation for Android Studio and Xcode.

### Acceptance

- Both projects build in debug mode on supported toolchains.
- Both launch the bundled app in a simulator or emulator with networking disabled.
- External links open through the operating system rather than replacing the app.
- No production signing material is committed.

## NAT-021: Configure Native Appearance and Safe Areas

**Depends on:** NAT-020  
**Parallel-safe with:** NAT-022, NAT-023

### Work

- Configure status-bar appearance for light and dark themes.
- Apply safe-area insets for notches, rounded corners, and home indicators.
- Configure launch screens using approved branding.
- Verify portrait orientation policy and document any supported landscape behaviour.
- Ensure keyboard, focus, scrolling, and overscroll behaviour feel intentional.

### Acceptance

- No content is obscured on representative iPhone and Android cutout devices.
- Theme changes produce legible system chrome.
- Launch does not flash an unrelated background colour.
- Text remains usable at maximum supported accessibility size.

## NAT-022: Implement Native Storage

**Depends on:** NAT-012, NAT-020  
**Parallel-safe with:** NAT-021, NAT-023

### Work

- Add the official Capacitor Preferences plugin or another explicitly approved on-device store.
- Implement the native storage adapter against the shared interface.
- Add first-run schema initialisation and future-safe migration handling.
- Keep all prayer records on device.
- Verify uninstall/reinstall and app-upgrade semantics and document them accurately.

### Acceptance

- All settings, history, and streaks survive app restart and app upgrade.
- Web and native schema semantics match.
- Failed or interrupted migrations do not destroy the last valid state.
- The application works without an account or network connection.

## NAT-023: Implement Native App Lifecycle and Link Handling

**Depends on:** NAT-014, NAT-020  
**Parallel-safe with:** NAT-021, NAT-022

### Work

- Connect Capacitor app lifecycle events to the shared lifecycle interface.
- Parse notification action data and route to the intended prayer context.
- Recompute season and schedule on cold launch, foreground resume, date change, and timezone change where platform events permit.
- Add universal/app link configuration only if an approved product need exists; notification routing must not depend on it.

### Acceptance

- Cold and warm notification taps open the correct context.
- Repeated foreground/background cycles do not duplicate event handlers.
- The current prayer changes correctly after a date or timezone transition.

## NAT-024: Review Native Network and Security Configuration

**Depends on:** NAT-020

### Work

- Restrict navigation and clear-text traffic appropriately.
- Confirm that content is loaded from the application bundle.
- Review Android manifest permissions and iOS usage-description keys.
- Remove unused permissions and plugins.
- Add dependency and secret scanning to CI where suitable.

### Acceptance

- Only required permissions are declared.
- No broad domain allow-list or arbitrary in-app browsing is enabled.
- Repository scans find no credentials, signing files, or developer-machine paths.
- A short threat model documents local prayer-data risks and mitigations.

---

# Phase 3: Native Bells

## NAT-030: Implement the Shared Rolling Notification Planner

**Depends on:** NAT-011, NAT-013

### Work

- Choose and document the scheduling horizon based on both platforms' pending-notification limits.
- Generate dated requests for enabled prayer times within that horizon.
- Include stable numeric/native identifiers, title, body, slot, prayer type, scheduled instant, and deep-link payload.
- Exclude elapsed times and Triduum silence.
- Use Regina Caeli during Eastertide and Angelus otherwise, with approved seasonal wording.
- Reconcile desired requests against currently pending requests instead of blindly duplicating them.

### Acceptance

- The planner is timezone-aware and deterministic.
- It never exceeds the documented platform limit.
- Reconciliation is idempotent.
- Unit tests cover year boundaries, leap years, DST transitions, Triduum, Eastertide, and all slot combinations.

## NAT-031: Implement Android Local Notifications

**Depends on:** NAT-020, NAT-023, NAT-030

### Work

- Add the official Capacitor Local Notifications plugin.
- Implement capability and permission flows for supported Android versions.
- Schedule and reconcile the shared rolling plan.
- Handle notification channels, icon, badge behaviour where supported, and notification taps.
- Investigate exact-alarm eligibility and current Google Play policy.
- Prefer ordinary local scheduling unless product requirements and store policy justify exact alarms.
- If exact alarms are used, provide a clear user explanation and graceful fallback when access is denied.
- Reschedule as required after reboot, app update, timezone change, or permission restoration.

### Acceptance

- Each selected daily slot fires on physical Android test devices within the approved tolerance.
- Disabled slots are cancelled.
- A notification tap opens the correct prayer context from killed, backgrounded, and foreground states.
- Denied permission produces a clear, non-blocking state.
- No duplicate notifications appear after repeated reconciliation or reboot.

## NAT-032: Implement iOS Local Notifications

**Depends on:** NAT-020, NAT-023, NAT-030

### Work

- Add the official Capacitor Local Notifications plugin.
- Implement the iOS authorization flow and settings guidance.
- Schedule and reconcile within iOS pending-notification limits.
- Configure categories or actions only when they serve a defined interaction.
- Handle notification taps from killed, backgrounded, and foreground states.
- Refresh the rolling horizon whenever the app launches or resumes.

### Acceptance

- Each selected daily slot fires on a physical iPhone within the approved tolerance.
- Disabled slots are cancelled.
- Triduum notifications remain silent because none are scheduled.
- Notification taps open the correct prayer context.
- Provisional, denied, and later-enabled permission states are handled accurately.

## NAT-033: Build Reminder Settings and Diagnostics

**Depends on:** NAT-031, NAT-032

### Work

- Retain independent toggles for morning, midday, and evening.
- Explain that operating-system settings control final delivery.
- Show the app's current permission state without implying more certainty than the OS provides.
- Add a user-invoked test notification.
- Add a non-sensitive diagnostics view showing planned slots, timezone, horizon, and last reconciliation result.
- Provide a direct route to system settings where supported.

### Acceptance

- Settings have consistent semantics on web, Android, and iOS.
- A user can recover after initially denying permission.
- Diagnostics contain no personal history or secret identifiers.
- Toggling a slot causes immediate, idempotent reconciliation.

## NAT-034: Validate Bells Across Time and State

**Depends on:** NAT-031 through NAT-033

### Work

- Test app states: foreground, background, force-closed, device restart, and post-update.
- Test permission states: not requested, granted, denied, revoked, and restored.
- Test clock changes: automatic timezone, manual timezone, DST spring forward, DST fall back, and date rollover.
- Test liturgical boundaries with injectable clocks in automation and real scheduling on physical devices.
- Record platform limitations honestly.

### Deliverable

- `docs/native/NOTIFICATION-QA.md` with device, OS, build, expected result, actual result, and evidence.

### Acceptance

- No release-blocking reminder defect remains.
- Known OS-level delivery limitations are documented in user-facing help where relevant.
- Exact timing claims match measured behaviour.

---

# Phase 4: Native Product Quality

## NAT-040: Audit Audio Narration

**Depends on:** NAT-020

### Work

- Test Web Speech API behaviour inside both native WebViews.
- Preserve the existing experience where reliable.
- If a platform fails acceptance, introduce an audio adapter and evaluate native text-to-speech or bundled recorded narration as a separately approved enhancement.
- Verify interruption, pause, screen lock, route change, and accessibility interaction.

### Acceptance

- Narration failure never blocks prayer use.
- Missing Latin voices are communicated or handled gracefully.
- Audio stops or persists according to an explicitly documented lifecycle policy.
- No unnecessary microphone permission is requested.

## NAT-041: Complete Accessibility QA and Repairs

**Depends on:** NAT-021, NAT-033, NAT-040

### Work

- Test VoiceOver and TalkBack reading order, names, roles, state announcements, and focus movement.
- Test large text, bold text, high contrast, reduced motion, and dark mode.
- Ensure prayer interactions do not depend on colour, gesture, or audio alone.
- Repair insufficient target sizes and focus visibility.
- Add automated accessibility checks where useful, without treating them as a replacement for assistive-technology testing.

### Acceptance

- A full prayer can be selected, followed, completed, and reviewed using a screen reader.
- Reminder permission and settings states are announced accurately.
- The UI remains operable at the maximum supported text scale.
- All blocking findings in the accessibility log are closed.

## NAT-042: Add Native App Icons and Launch Assets

**Depends on:** NAT-002, NAT-020  
**Human approval required:** final artwork

### Work

- Generate platform-specific icons from an approved master asset.
- Provide Android adaptive foreground/background assets and monochrome icon where applicable.
- Provide the required iOS icon set without transparency where prohibited.
- Configure notification icons separately from launcher icons.
- Produce launch-screen assets and verify theme consistency.

### Acceptance

- Assets pass current Android Studio and Xcode validation.
- Icons remain legible at small sizes and in Android themed-icon treatment.
- There are no placeholder Capacitor assets.
- Notification icons render correctly on representative Android devices.

## NAT-043: Add App Shortcuts

**Depends on:** NAT-014, NAT-020  
**May be deferred until after v1:** yes

### Work

- Add a “Pray now” shortcut on both platforms.
- Add morning, midday, or evening shortcuts only if they remain uncluttered and useful.
- Route shortcuts through the same validated deep-link state as notification taps.

### Acceptance

- Shortcuts work after fresh launch and while the app is resident.
- Unsupported or stale shortcut data falls back safely.
- Shortcut labels are localisable and accessible.

## NAT-044: Add Privacy, Support, and In-App Information

**Depends on:** NAT-002, NAT-022, NAT-033

### Work

- Publish an accurate privacy policy stating what is stored, where it is stored, and whether any data leaves the device.
- Add in-app links for privacy, support, source code, licence, and app version.
- Explain reminder permissions and export/import behaviour.
- Review third-party dependencies for disclosure obligations.

### Acceptance

- Privacy claims match network inspection and implementation.
- Store privacy declarations can be completed from the documented data inventory.
- Support and privacy URLs are publicly reachable.
- GPL licence obligations remain satisfied for distributed binaries and source availability.

## NAT-045: Add Localisation Readiness

**Depends on:** NAT-010  
**May be deferred until after v1:** yes

### Work

- Separate interface strings from prayer texts.
- Avoid string concatenation that prevents grammatical translation.
- Use locale-aware date and time display.
- Preserve approved English, contemporary, and Latin prayer text exactly.

### Acceptance

- Interface strings can be translated without editing rendering logic.
- Long-string and pseudo-localisation tests do not break core layouts.
- Language selection is not conflated with prayer-text mode.

---

# Phase 5: Automation and Continuous Integration

## NAT-050: Add Shared CI

**Depends on:** NAT-010, NAT-011, NAT-016

### Work

- Run install, static checks, unit tests, and web production build on pull requests.
- Cache dependencies safely.
- Upload only non-sensitive diagnostic artifacts needed to understand failures.
- Add dependency update and vulnerability review policies.

### Acceptance

- CI passes from a clean checkout.
- A failing domain test blocks merge.
- Lockfile changes are visible and reviewable.
- CI contains no production signing secrets.

## NAT-051: Add Android Build CI

**Depends on:** NAT-020, NAT-050

### Work

- Build the Android debug application in CI.
- Run native unit or instrumentation tests where valuable.
- Validate manifest and resources.
- Keep Play signing and release credentials out of pull-request workflows.

### Acceptance

- Every relevant pull request produces a verifiable Android debug build or build result.
- Gradle caches are correctly keyed.
- Native compile failures block merge.

## NAT-052: Add iOS Build CI

**Depends on:** NAT-020, NAT-050

### Work

- Build the iOS project on a pinned supported macOS/Xcode runner.
- Run tests without production signing where possible.
- Document the chosen strategy for signed archives and secret access.

### Acceptance

- Every relevant pull request validates the iOS project.
- The deployment target and Xcode version are explicit.
- Pull requests from untrusted contexts cannot access signing credentials.

## NAT-053: Define Versioning and Release Notes

**Depends on:** NAT-020

### Work

- Adopt a single human-readable application version across web, Android, and iOS.
- Define automated or documented handling for Android version codes and iOS build numbers.
- Add a changelog and release-note template.
- Display the version and build number in the app.

### Acceptance

- Every uploaded store build has a unique monotonic build identifier.
- The source commit for each release can be recovered from release metadata.
- User-facing release notes avoid implementation jargon.

---

# Phase 6: Android Release

## NAT-060: Prepare Android Signing and Play Console

**Depends on:** NAT-002, NAT-024, NAT-042, NAT-044, NAT-053  
**Human action required:** yes

### Work

- Create the Play Console application under the approved owner account.
- Configure Play App Signing and securely manage the upload key.
- Set package name, application category, contact details, and default language.
- Complete app access, content rating, target audience, ads, data safety, and other current declarations truthfully.
- Verify current target API and policy deadlines before submission.

### Acceptance

- Signing and recovery ownership are documented outside the public repository.
- The upload key is backed up securely and never committed.
- Console declarations match the implementation and privacy policy.

## NAT-061: Produce the Android Store Listing

**Depends on:** NAT-042, NAT-044  
**Human approval required:** copy and images

### Work

- Write title, short description, full description, and release notes within current Play limits.
- Produce phone and any supported tablet screenshots from a release-candidate build.
- Produce feature graphic and approved icon.
- Provide support and privacy-policy URLs.
- Avoid claims that notification delivery can exceed operating-system guarantees.

### Acceptance

- All listing assets meet current Play dimensions and content rules.
- Screenshots show actual app behaviour.
- Copy accurately describes offline use, local data, and optional reminders.

## NAT-062: Run Android Internal and Closed Testing

**Depends on:** NAT-034, NAT-041, NAT-051, NAT-060, NAT-061

### Work

- Build a signed Android App Bundle from a tagged release candidate.
- Distribute first through internal testing.
- Test installation, upgrade, notifications, deep links, offline use, import/export, narration, and accessibility.
- Expand to closed testing if required by current Play account rules or product policy.
- Triage tester feedback by release-blocking severity.

### Acceptance

- Required Play pre-launch and policy checks pass or have documented resolutions.
- No release-blocking defects remain.
- Upgrade testing preserves on-device data.
- Final AAB provenance and checksums are recorded securely.

## NAT-063: Submit and Release Android

**Depends on:** NAT-062  
**Human approval required:** final submission and rollout

### Work

- Promote the approved build to production.
- Complete the final policy review.
- Use a staged rollout when available and appropriate.
- Monitor crashes, ANRs, reviews, reminder defects, and policy messages.
- Define rollback or rollout-halt criteria before release.

### Acceptance

- The production listing is approved and publicly installable in the intended regions.
- Source tag, store version, build artifact, and release notes correspond.
- Support can identify and respond to version-specific reports.

---

# Phase 7: iOS Release

## NAT-070: Prepare Apple Signing and App Store Connect

**Depends on:** NAT-002, NAT-024, NAT-042, NAT-044, NAT-053  
**Human action required:** yes

### Work

- Register the approved bundle identifier and required capabilities.
- Create the App Store Connect record under the approved organisation or individual.
- Configure certificate and provisioning management through an approved secure process.
- Set category, age rating, support URL, privacy URL, and territories.
- Complete App Privacy disclosures truthfully.

### Acceptance

- Bundle identifier matches the generated project and cannot drift.
- Signing ownership and recovery are documented securely.
- App Privacy answers match the data inventory and observed network behaviour.

## NAT-071: Produce the iOS Store Listing

**Depends on:** NAT-042, NAT-044  
**Human approval required:** copy and images

### Work

- Write app name, subtitle, promotional text, description, keywords, and release notes within current limits.
- Capture screenshots for every required supported display class.
- Prepare review notes explaining fully bundled offline prayer content and native scheduled bells.
- Provide reviewer instructions for testing reminders without waiting for normal prayer times, using only production-safe diagnostics.

### Acceptance

- Metadata and screenshots meet current App Store requirements.
- Review notes make the app's native value clear under minimum-functionality review.
- No private test account is required because the app has no account system.

## NAT-072: Run TestFlight Testing

**Depends on:** NAT-034, NAT-041, NAT-052, NAT-070, NAT-071

### Work

- Archive and upload a signed release candidate.
- Complete internal TestFlight testing first.
- Test clean install, upgrade, notification permissions, killed-app taps, offline use, import/export, narration, screen readers, and large text.
- Add external testing if useful, completing beta review requirements.
- Triage tester feedback by release-blocking severity.

### Acceptance

- No release-blocking defects remain.
- Tested devices include at least one current and one oldest-supported iOS version where practical.
- Upgrade testing preserves on-device data.
- The final candidate has no placeholder metadata or development endpoints.

## NAT-073: Submit and Release iOS

**Depends on:** NAT-072  
**Human approval required:** final submission and release

### Work

- Select the approved build and complete export-compliance, content-rights, privacy, and review information.
- Submit for App Review.
- Respond to review questions with evidence from the implementation and review notes.
- Choose manual, scheduled, or phased release after approval.
- Monitor crashes, reviews, reminder defects, and App Store messages.

### Acceptance

- The production listing is approved and publicly installable in the intended regions.
- Source tag, App Store version, build number, and release notes correspond.
- A support and hotfix process is active.

---

# Phase 8: Post-Release Operations

## NAT-080: Establish Release Monitoring and Support

**Depends on:** NAT-063 and/or NAT-073

### Work

- Create a privacy-preserving process for user-submitted diagnostics and support reports.
- Monitor store crash and performance reports without adding third-party tracking by default.
- Track OS releases, Capacitor security updates, store-policy changes, and target-SDK deadlines.
- Define response times and severity for reminder, data-loss, accessibility, and launch failures.

### Acceptance

- A named maintainer can reproduce a report from app version, OS version, device class, timezone, permission state, and diagnostics export.
- Critical update and store-compliance responsibilities are assigned.
- Support guidance never asks users to disclose prayer history unnecessarily.

## NAT-081: Run the First Post-Launch Review

**Depends on:** at least one production release

### Work

- Review support reports, store feedback, crashes, accessibility findings, and notification reliability.
- Compare actual scope and maintenance cost against the architecture decisions.
- Prioritise corrective work before optional native expansion.
- Decide whether widgets, richer shortcuts, recorded narration, additional languages, or tablet layouts justify future releases.

### Deliverable

- `docs/native/POST-LAUNCH-REVIEW.md`

### Acceptance

- Findings are evidence-based and separated into defects, policy work, maintenance, and enhancements.
- No analytics system is introduced merely to compensate for missing product questions.
- A bounded next-release plan is approved.

## NAT-082: Optional Home-Screen Widgets

**Depends on:** stable Android and iOS v1 releases  
**Separate release recommended:** yes

### Work

- Define a widget showing the next prayer time and current prayer type.
- Share only the minimum state required through platform-approved app-group or widget storage.
- Provide useful placeholder and stale-data states.
- Deep-link widget interactions to the relevant prayer.

### Acceptance

- Widgets do not expose prayer history.
- Widget data refresh respects platform budgets.
- Timezone, season, and Triduum state stay correct.
- The main app remains fully functional without the widget.

---

# Dependency Summary

| Milestone | Required tasks |
| --- | --- |
| Native-ready web core | NAT-001, NAT-010 to NAT-016 |
| Debug native shells | NAT-002, NAT-020 to NAT-024 |
| Feature-complete reminders | NAT-030 to NAT-034 |
| Store-quality release candidate | NAT-040 to NAT-053 |
| Android production release | NAT-060 to NAT-063 |
| iOS production release | NAT-070 to NAT-073 |
| Sustainable maintenance | NAT-080 to NAT-081 |

## Suggested Parallel Work

After the baseline decisions are complete, these lanes can proceed with limited overlap:

| Lane | Tasks | Primary ownership |
| --- | --- | --- |
| Shared domain | NAT-011, NAT-013, NAT-030 | Liturgical logic and notification planning |
| Data | NAT-012, NAT-015, NAT-022 | Storage, migration, export/import |
| Shell | NAT-014, NAT-020, NAT-021, NAT-023, NAT-024 | Capacitor and native integration |
| Quality | NAT-003, NAT-041, NAT-044, NAT-050 | QA, accessibility, privacy, CI |

Agents working in parallel must not edit the same files without coordination. Prefer interface-first commits so platform implementations can proceed against reviewed contracts.

# Release Checklists

## Shared Release Candidate

- [ ] All prayer modes render correctly.
- [ ] Seasonal and Triduum logic passes automated tests.
- [ ] Existing PWA data survives deployment.
- [ ] Native data survives restart and upgrade.
- [ ] App launches and prayers work offline.
- [ ] Import/export is validated and reversible before confirmation.
- [ ] Permissions are requested only in user context.
- [ ] No secrets or signing files are present in the repository.
- [ ] Privacy policy and in-app disclosures match observed behaviour.
- [ ] Accessibility quality gates pass.
- [ ] Version and source commit are identifiable.

## Notification Release Candidate

- [ ] Morning, midday, and evening toggles reconcile correctly.
- [ ] Android physical-device tests pass.
- [ ] iPhone physical-device tests pass.
- [ ] Cold, background, and foreground notification taps route correctly.
- [ ] Denial, revocation, and restoration flows work.
- [ ] Restart, update, timezone, and DST tests are recorded.
- [ ] Triduum produces no scheduled bells.
- [ ] Eastertide reminders say Regina Caeli.
- [ ] Reconciliation creates no duplicates.
- [ ] User-facing timing claims reflect OS limitations.

## Android Submission

- [ ] Release AAB is signed through the approved process.
- [ ] Play App Signing and upload-key recovery are documented securely.
- [ ] Target API and current policy requirements are verified.
- [ ] Data Safety, ads, age, content, and access declarations are accurate.
- [ ] Store copy and images are approved.
- [ ] Internal/closed test requirements are satisfied.
- [ ] Staged-rollout and halt criteria are agreed.

## iOS Submission

- [ ] Release archive uses the approved bundle identifier and signing team.
- [ ] App Privacy and export-compliance answers are accurate.
- [ ] Store copy, screenshots, and review notes are approved.
- [ ] TestFlight testing is complete.
- [ ] Reviewers can test native reminders using documented controls.
- [ ] The app's native value is clear: scheduled bells, deep links, bundled offline operation, and native integration.
- [ ] Release mode and hotfix ownership are agreed.

# Recommended First Agent Assignment

Assign NAT-001 first. Its baseline and storage findings make NAT-010 through NAT-016 safer. In parallel, the project owner can resolve NAT-002 and approve NAT-003. Do not initialise native projects until the application identifier and ownership decisions in NAT-002 are final.

