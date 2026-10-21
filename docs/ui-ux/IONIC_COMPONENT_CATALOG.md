# Native-Style Ionic Component Catalog

**Checkpoint:** `UX_CONTRACT_READY`

Use Ionic components in their adaptive platform modes. Customize through design tokens, CSS custom properties and documented shadow parts; do not recreate native controls with decorative custom divs.

## Application shell and navigation

| Pattern | Ionic/Angular primitive | Use | Constraints |
|---|---|---|---|
| Root | `ion-app`, `ion-router-outlet` | One application container and route outlet | Exactly one `ion-app` |
| Role tabs | `ion-tabs`, `ion-tab-bar`, `ion-tab-button` | Separate Driver/Operator tab shells | Stable five-tab order per role |
| Page chrome | `ion-header`, `ion-toolbar`, `ion-title`, `ion-buttons` | Native page hierarchy/actions | One clear title; avoid crowded toolbars |
| Back | `ion-back-button` | Nested detail/form return | Respect tab stack and unsaved guard |
| Segment | `ion-segment`, `ion-segment-button` | Map/list or scoped state switch | Not a replacement for primary tabs |
| Breadcrumbs | None on phone MVP | Avoid desktop-style hierarchy | Use page titles/back navigation |

## Lists, summaries and detail

| Pattern | Primitive | VALRYDE use |
|---|---|---|
| Operational list | `ion-list`, `ion-item`, `ion-label`, `ion-note` | Vehicles, drivers, groups, requests, events |
| Avatar/icon | `ion-avatar`, `ion-icon` | Person/vehicle/group identity; icon never sole status |
| Status | `ion-badge`, `ion-chip` | Approval, GPS, compliance, connectivity |
| Grouped details | inset/grouped `ion-list`, `ion-list-header` | Profile, vehicle, transit and request details |
| Compact metrics | list rows/chips | Dashboard/transit summary; avoid oversized metric cards |
| Card | `ion-card` | Only for a genuinely independent summary or onboarding instruction |

## Forms

| Need | Primitive | Contract |
|---|---|---|
| Text/email/password | `ion-input` | Persistent label, input mode/autocomplete, inline error |
| Long explanation | `ion-textarea` | Route request/rejection-safe text; bounded length |
| Single choice | `ion-select` | Eligible vehicle/driver/group/route direction only |
| Date | `ion-datetime` in modal | Preferred installation date; timezone/availability contract required |
| Boolean preference | `ion-toggle` | Optional audio warning; never authorization/business state |
| Search | `ion-searchbar` | Local/server search according to endpoint contract |
| Submit | `ion-button` | Disable during request; explicit verb |
| Unsaved form | Angular `CanDeactivate` + `ion-alert` | Confirm discard; never save silently |

Never represent server state transitions such as approval, installation or compliance as a freely editable toggle.

## Feedback and overlays

| Situation | Primitive | Guidance |
|---|---|---|
| Initial loading | `ion-skeleton-text`, `ion-spinner` | Preserve layout; announce progress |
| Pull to reconcile | `ion-refresher` | List/detail snapshot refresh only |
| Pagination | `ion-infinite-scroll` if needed | Only after API pagination is confirmed |
| Brief success | `ion-toast` | Noncritical acknowledgement; plaintext content |
| Blocking confirmation | `ion-alert` | Sign out, discard changes, high-impact assignment |
| Context actions | `ion-action-sheet` | Small, permitted action set only |
| Picker/form overlay | `ion-modal` | Assignment and date flows; return focus on dismiss |
| Map/detail peek | break-point `ion-modal` sheet | Vehicle/groupmate summary without obscuring whole map |
| Error | inline `ion-text`/banner, `ion-alert` if blocking | Keep persistent errors near affected content |
| Offline/reconnect | persistent toolbar/content banner | Non-modal; last sync visible |

## Map composition

MapLibre renders the map; Ionic provides surrounding controls.

| Element | Component/pattern | Requirement |
|---|---|---|
| Map host | semantic container inside `ion-content` | Accessible label and non-map fallback/list |
| Recenter/follow | icon-only `ion-button` in floating control group | 48 px target, accessible name, pressed state |
| Own vehicle status | bottom sheet/list item | Plate, freshness, motion, compliance |
| Groupmate detail | bottom sheet | Authorized safe fields only |
| Compliance warning | persistent banner + sheet detail | Text/icon plus color; optional audio mute |
| Map/list switch | `ion-segment` | Preserve selection and scope |
| Filters | modal/sheet | Only supported vehicle/group/status filters |

## Empty, error and denied patterns

- Empty: icon/short title/explanation/one authorized action; no decorative oversized card.
- Error: identify affected operation, retain safe input, offer retry when appropriate.
- Denied: remove protected content first, then explain access is unavailable.
- Stale/offline: show last successful update and avoid “live” labels.
- Unknown tracking: distinguish no fix, stale fix, offline tracker, bridge/API outage only when the backend contract supports the distinction.

## Accessibility requirements

- Slotted decorative icons use `aria-hidden`; icon-only buttons have accessible labels.
- Status includes readable text and does not rely on color.
- Modal/sheet focus moves into the overlay and returns to the launcher.
- Dynamic type does not hide critical status or actions.
- Live regions announce coarse state transitions, not every GPS position.
- Form errors are programmatically linked to inputs.

## Security requirements

- Keep Ionic/Angular sanitization enabled; render service strings as plaintext.
- Never enable arbitrary HTML templates for alerts/toasts from API data.
- Do not place bearer tokens, private identifiers or secrets in component attributes, URLs or logs.
- External content uses an approved isolated browser surface, not the primary WebView storage context.
