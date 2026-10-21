# Initial Bundle Budget — Findings

**Date:** 2026-10-21 · **Build:** production, Node 24.15.0, Angular 22.2.3, Ionic 9.0.8
**Budget (unchanged per Tech Lead):** initial warning 700 kB, error 1 MB
**Current:** 843.54 kB raw / ~192 kB transfer. Non-failing warning.

## Investigation

| Area | Finding |
|---|---|
| Lazy routes/pages | Every page and both role shells use `loadComponent`; only `AppComponent`, the connectivity banner and app config are eager. Nothing to move. |
| Duplicate libraries | None. No nested `node_modules` copies appear in the bundle; `rxjs`, `tslib`, `@angular/*` and `@ionic/core` resolve to one version each. |
| Unused Ionic imports | None. The compiler reports no unused standalone imports (NG8113). |
| Build optimization | Production defaults already apply (minify, tree-shake, hashing, no source maps). |
| **Root cause** | `app.config.ts` imports `provideIonicAngular` from the `@ionic/angular` barrel. Because the barrel is reachable from `main`, esbuild places every Ionic directive used *anywhere* in the app (and `@angular/forms`, pulled in by Ionic's value accessors) in the initial chunk, even when only lazy pages use them. `@ionic/core` is 457 kB of the initial JS. |

## Measurements

| Experiment | Initial raw |
|---|---:|
| Current (barrel imports) | 843.54 kB |
| Per-component subpaths (`@ionic/angular/ion-button`, …), barrel still used for `provideIonicAngular` | 849.72 kB |
| Per-component subpaths **and** no barrel at all (provider removed; app non-functional, measurement only) | **516.69 kB** |

Splitting only works once nothing eager imports the barrel. Ionic 9 exports `provideIonicAngular`, `ModalController` and `PopoverController` **only** from the barrel.

## Options (not applied)

1. **App-local provider.** Re-create `provideIonicAngular` (about 20 lines) from public `@ionic/angular/common` and `@ionic/core/components` exports, and switch to subpath imports. Saves about 327 kB. Costs:
   - It copies Ionic internals that must be re-checked on every Ionic upgrade.
   - It needs `@ionic/core` declared directly.
   - `ModalController`/`PopoverController` stay barrel-only, so later programmatic overlays would bring the barrel back. Inline `ion-modal`/`ion-alert` components would be unaffected.
2. **Upstream.** Ask Ionic for a providers/controllers subpath export, then apply subpath imports with no copied code.
3. **Zoneless change detection.** This would drop `zone.js` (about 43 kB). It needs verification against Ionic 9 and is a behavior change, not a bundle fix.

## Update — account/session slice (2026-10-21)

Initial bundle: **911.50 kB** raw / ~204 kB transfer (+68 kB). Measured contributors:
- `@ionic/core` +57 kB: the `ion-alert` overlay used by the Account page, made eager by the barrel cause above.
- `@capacitor/core` +10 kB: the native bridge needed by the secure token vault.
- `@aparajita/capacitor-secure-storage` +1 kB.

Per Tech Lead decision, no Ionic internals were copied and thresholds are unchanged; the warning stays documented.

Recommendation: keep the documented warning for the foundation. Decide on option 1 or 2 before the first feature slice that adds substantial UI.
