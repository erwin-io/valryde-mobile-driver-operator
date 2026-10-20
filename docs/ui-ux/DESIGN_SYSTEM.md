# Valryde Operator Design System

**Checkpoint:** `UX_CONTRACT_READY`
**Implementation status:** Contract only; no app scaffold or styles have been created.

## Design principles

1. **Operational before decorative.** Vehicle, route, freshness, compliance and next action outrank illustration or branding.
2. **Glanceable while driving.** Driver map/status surfaces use few controls, short labels, stable placement and high contrast.
3. **Native familiarity.** Use Ionic adaptive iOS/Material behavior instead of imitating another app's proprietary visuals.
4. **Truthful state.** Unknown, stale, offline, denied and loading are distinct from valid empty or healthy states.
5. **Server authority.** UI availability never implies permission or successful state transition.

Ionic's adaptive styling, CSS custom properties and platform modes are the baseline. Angular route guards support navigation safety but never replace backend authorization. Capacitor lifecycle events trigger session/snapshot reconciliation on resume.

## Color tokens

All values are proposed UX tokens and must pass contrast testing before implementation.

| Token | Light value | Purpose |
|---|---:|---|
| `--vr-color-primary` | `#075985` | Primary actions, selected navigation, links |
| `--vr-color-primary-strong` | `#0C4A6E` | Pressed/strong emphasis |
| `--vr-color-surface` | `#FFFFFF` | Main surface |
| `--vr-color-surface-subtle` | `#F1F5F9` | Grouped page/list background |
| `--vr-color-text` | `#0F172A` | Primary text |
| `--vr-color-text-muted` | `#475569` | Secondary metadata |
| `--vr-color-border` | `#CBD5E1` | Dividers and input outlines |
| `--vr-color-success` | `#16794A` | Confirmed success / ON_ROUTE where text also present |
| `--vr-color-warning` | `#A15C00` | Attention, scheduled/pending, stale |
| `--vr-color-danger` | `#B42318` | OFF_ROUTE, destructive error |
| `--vr-color-info` | `#0369A1` | Informational state |
| `--vr-color-unknown` | `#64748B` | UNKNOWN / unavailable |

No decorative gradients. Route colors come from backend data and are not reused as semantic status colors. Status always includes text/icon, never color alone.

## Typography

- Use platform system font through Ionic defaults.
- Page title: 20–22 px equivalent, semibold.
- Section title: 17–18 px, semibold.
- Body/list title: 16 px minimum.
- Supporting metadata: 14 px minimum; 12 px only for nonessential map attribution/legal text.
- Numeric operational status uses tabular numerals where supported.
- Support dynamic text scaling without truncating critical status or actions.

## Spacing and shape

- Base spacing unit: 4 px; common gaps 8, 12, 16, 24, 32 px.
- Page horizontal inset: 16 px phone; responsive maximum content width for tablet.
- Minimum interactive target: 44×44 CSS px; prefer 48 px for Driver map controls.
- Radius: 8 px inputs/buttons, 12 px grouped surfaces, full radius only for chips/badges.
- Elevation: flat lists with dividers by default; one restrained shadow level for floating map controls/sheets.
- Cards are for true grouping only, not every metric or list row.

## Layout patterns

### Driver

- Home: one urgent-state header, compact assignment list, one primary “Open route map” action.
- Route Map: edge-to-edge map, top safe-area status strip, bottom vehicle/compliance sheet, right-side recenter/follow controls.
- Group: map/list switch with simple status/filter controls.
- Avoid grids of KPI cards and long forms in driving context.

### Operator

- Dashboard: compact summary rows/chips plus exception-first lists; no decorative analytics.
- Fleet/Transits/Requests: searchable/filterable Ionic lists with status, key metadata and disclosure navigation.
- Detail: grouped `ion-list` sections and a fixed/clear primary action only when permitted.
- Create/edit: one-column form, labels above values, inline validation, sticky submit only when it does not hide keyboard content.

## Semantic operational states

| State | Visual treatment | Required text behavior |
|---|---|---|
| ON_ROUTE | Success icon/color | “On route” + last update |
| OFF_ROUTE | Danger icon/color; persistent driver banner | “Off route” + last update; optional audio setting |
| UNKNOWN | Neutral/unknown icon | “Route status unknown”; never “safe” |
| Fresh location | Normal marker | Last update available on detail |
| Stale location | Muted marker only if contract permits retained display | Explicit “Location stale”; not live |
| Offline tracker | Offline icon/text | Distinct from app/network/API failure |
| Pending/Approved/Scheduled/Installed/Rejected | Text badge + icon | Use exact server state; no inferred progression |
| Loading | Skeleton/spinner | Preserve layout and announce loading |
| Empty | Plain illustration/icon optional | Explain reason and authorized next action |
| Error | Inline/banner depending scope | Explain retry or required owner action |

## Motion and feedback

- Use Ionic default transitions; avoid custom parallax and decorative motion.
- Respect reduced-motion preferences.
- Haptics, if later approved, are optional and never the sole warning.
- Toasts acknowledge noncritical completion; blocking failures stay inline or in an alert.
- OFF_ROUTE warning remains visible until backend-validated state changes; a toast alone is insufficient.

## Accessibility

- Visible focus and logical focus return after modal/sheet dismissal.
- Accessible names for icon-only map controls; decorative icons hidden from assistive technology.
- Headings and landmarks reflect visual hierarchy.
- Inputs use persistent labels, instructions and programmatic error association.
- Live regions announce connection/status changes without repeating every telemetry update.
- Test light/dark/high-contrast modes, dynamic type, screen reader, keyboard and orientation changes.

## Security and privacy presentation

- Render service/user strings as text; do not enable arbitrary HTML templates.
- Never display/store Traccar credentials, provider secrets, private channel secrets or database identifiers.
- Mask sensitive contact information according to approved DTOs.
- External links open through an approved isolated browser strategy; no untrusted content inside the main app storage context.
- Session tokens require an approved OS-backed secure-storage approach; ordinary preferences are not a token vault.

## Framework reference baseline

- Ionic Framework: adaptive components, Angular navigation and CSS-variable theming.
- Angular: functional guards/redirect results for client navigation safety; server authorization remains mandatory.
- Capacitor: app lifecycle/deep-link handling and native container integration after explicit implementation review.

Exact package versions are selected and locked during the approved scaffold checkpoint, not by this UX contract.

## Official framework references reviewed

- Ionic Framework fundamentals and adaptive styling: <https://ionicframework.com/docs/core-concepts/fundamentals>
- Ionic Angular navigation: <https://ionicframework.com/docs/angular/navigation>
- Ionic theming basics: <https://ionicframework.com/docs/theming/basics>
- Ionic security guidance: <https://ionicframework.com/docs/techniques/security>
- Angular route guards and server-authorization warning: <https://angular.dev/guide/routing/route-guards>
- Capacitor documentation and app lifecycle API: <https://capacitorjs.com/docs> and <https://next.capacitorjs.com/docs/apis/app>
