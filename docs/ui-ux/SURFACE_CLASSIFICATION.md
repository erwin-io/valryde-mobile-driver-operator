# VALRYDE Operator — Surface Classification

**Checkpoint:** Frontend foundation (released by Tech Lead, 2026-10-21)
**Source:** the 65 surfaces in [`SCREEN_INVENTORY.md`](./SCREEN_INVENTORY.md)
**Purpose:** Tech Lead release requirement: not every inventoried surface is a standalone page. This file decides how each one is built.

## Categories

| Code | Meaning |
|---|---|
| **PAGE** | Required MVP screen with its own route |
| **COMP** | Reusable component, a page mode, or a segment inside another page (no standalone route) |
| **SHEET** | Dialog, modal or bottom sheet opened from a page |
| **GLOBAL** | Global UI state shared by every page |
| **FUTURE** | Optional, outside MVP scope; built only with a justified requirement and Tech Lead approval |

**Class** is scope and shape; **Gate** is backend readiness, recorded separately. A gate never changes a surface's MVP status.

**Gate** shows the dependency that must be resolved before *live data* ships: `—` none, `A` Agent A contract review/gap, `B` Agent B tracking/realtime contract, `A+B` both. **`A-blocked`** means the Agent A capability does not exist yet; only the page's unavailable state may be built, and no API is invented. A gated PAGE still gets its shell, empty and unavailable states now. It never gets invented data.

**Foundation** shows what this slice delivers: `Built` (real behavior against verified contracts), `Shell` (layout and explicit unavailable state only), `Placeholder` (tab route with a gate message), or blank (later slice).

## Shared and authentication

| ID | Surface | Class | Gate | Foundation | Note |
|---|---|---|---|---|---|
| S01 | Welcome | FUTURE | — | | Tech Lead: FUTURE / OPTIONAL. Sign-in already serves as the entry. |
| S02 | Sign in | PAGE | — | Built | Agent A `POST /api/auth/login`; rejects accounts without DRIVER/OPERATOR. Google entry deferred. |
| S03 | Choose account type / register | PAGE | — | Built | One page with a Driver/Operator segment. |
| S04 | Driver registration | COMP | — | Built | Driver mode of S03. |
| S05 | Operator registration | COMP | — | Built | Operator mode of S03. |
| S06 | Verify email | PAGE | — | | Agent A endpoints observed. |
| S07 | Forgot password | PAGE | — | | Agent A endpoint observed. |
| S08 | Reset password | PAGE | — | | Agent A endpoint observed. |
| S09 | Role context chooser | PAGE | — | Built | Multi-role accounts only; offers only server-granted roles. |
| S10 | Account | PAGE | — | Placeholder | Account tab in both shells. |
| S11 | Edit profile | PAGE | A | | `PATCH /api/auth/me` DTO review. |
| S12 | Account security | PAGE | — | | Change password/email endpoints observed. |
| S13 | Sign-out confirmation | SHEET | — | | `ion-alert`. |

## Driver

| ID | Surface | Class | Gate | Foundation | Note |
|---|---|---|---|---|---|
| D01 | Driver Home | PAGE | A+B | Shell | No-assignment state shown; no data simulated. |
| D02 | My Jeepney | PAGE | A | | Fleet DTO review. |
| D03 | Assigned Route Detail | PAGE | A | | Uses Agent A effective-route resolver only. `ROUTE_ASSIGNMENT_CONFLICT` shown as its own state. |
| D04 | Route Guidance Map | PAGE | B | Placeholder | MapLibre added when the map slice starts. |
| D05 | Own Vehicle Map Detail | SHEET | B | | Bottom sheet on D04. |
| D06 | Off-route Warning | COMP | B | | Persistent banner and detail sheet; displays backend compliance state only. |
| D07 | Group Map/List | PAGE | B | Placeholder | |
| D08 | Groupmate Detail | PAGE | B | | Groupmate DTO blocked. |
| D09 | Driver Events | PAGE | B | Placeholder | Events tab; keep or fold into D06 history once Agent B defines events. |
| D10 | Driver Event Detail | FUTURE | B | | Tech Lead: FUTURE / OPTIONAL pending a justified event-detail requirement; D09 rows may suffice. |
| D11 | No Assignment | COMP | — | Built | `app-state-panel` empty state on D01. |
| D12 | Tracker/Route Unavailable | COMP | B | | `app-state-panel` variants keyed by Agent B's error taxonomy. |

## Operator

| ID | Surface | Class | Gate | Foundation | Note |
|---|---|---|---|---|---|
| O01 | Operator Dashboard | PAGE | A+B | Shell | Counts show `—` until the aggregate contract exists; never computed locally. |
| O02 | Fleet Hub | PAGE | — | Placeholder | Fleet tab root. |
| O03 | My Jeepneys | PAGE | A | | |
| O04 | Add Jeepney | PAGE | — | | Shares one form component with O06. |
| O05 | Jeepney Detail | PAGE | A | | Orchestrates several Agent A reads. |
| O06 | Edit Jeepney | COMP | — | | Edit mode of the O04 form. |
| O07 | Vehicle Application | PAGE | — | | |
| O08 | Drivers | PAGE | A | | List/association contract incomplete. |
| O09 | Associate Driver | PAGE | A | | No association flow until Agent A confirms the workflow. |
| O10 | Driver Detail | PAGE | A | | |
| O11 | Assign Driver to Jeepney | SHEET | — | | |
| O12 | Fleet Groups | PAGE | — | | |
| O13 | Create Group | PAGE | — | | Shares one form component with O15. |
| O14 | Group Detail | PAGE | — | | |
| O15 | Edit Group | COMP | — | | Edit mode of the O13 form. |
| O16 | Manage Group Members | SHEET | — | | |
| O17 | Fleet Live Map | PAGE | B | | |
| O18 | Transits | PAGE | A | Placeholder | Transits tab root; summary part gated. |
| O19 | Transit Detail | PAGE | — | | Read-only official route/directions. |
| O20 | Assign Transit Direction | SHEET | — | | Re-reads the server effective route after submit. |
| O21 | Transit Route Map | COMP | B | | Map segment of O19. |
| O22 | Transit Summary | COMP | A+B | | Summary segment of O19; aggregate contract blocked. |
| O23 | Compliance Overview | PAGE | B | | |
| O24 | Vehicle Compliance Detail | PAGE | B | | |
| O25 | Requests Hub | PAGE | — | Placeholder | Requests tab root. |
| O26 | GPS Setup Requests | PAGE | A | | |
| O27 | New GPS Setup Request | PAGE | A | | |
| O28 | GPS Request Detail | PAGE | A | | |
| O29 | Route Change Requests | PAGE | A-blocked | | Tech Lead: MVP requirement, backend-blocked (Agent A missing capability G7). Gated until workflow, endpoints, RBAC and DTOs are approved. |
| O30 | New Route Change Request | PAGE | A-blocked | | Tech Lead: MVP requirement, backend-blocked (G7). Describes a requested change only; never edits official geometry. |

## Global states

| ID | Surface | Class | Gate | Foundation | Note |
|---|---|---|---|---|---|
| G01 | Initial app/session loader | GLOBAL | — | | Needed once session restore exists; tokens are in-memory only today. |
| G02 | Offline banner | GLOBAL | — | Built | `app-connectivity-banner`; pushes content down, never covers toolbars. |
| G03 | Reconnecting indicator | GLOBAL | B | | Realtime contract required. |
| G04 | Access denied | GLOBAL | — | Built (redirect) | `roleGuard` sends wrong-role and anonymous sessions to sign-in. A dedicated message comes with the first API 403 handling. |
| G05 | Expired session | GLOBAL | — | Built | One refresh attempt on 401, then the session is cleared and sign-in shows "Your session ended". |
| G06 | Generic API error | GLOBAL | — | Built (sign-in) | Plain-language outage versus bad-details messages. |
| G07 | Empty list | COMP | — | Built | `app-state-panel`. |
| G08 | Skeleton/loading | COMP | — | | `ion-skeleton-text`, added with the first list page. |
| G09 | Unsaved changes confirmation | SHEET | — | | `ion-alert` with a `canDeactivate` guard on create/edit forms. |
| G10 | Stale data marker | COMP | B | | Freshness thresholds come from Agent B. |

## Totals

| Class | Count |
|---|---:|
| PAGE | 39 |
| COMP | 12 |
| SHEET | 6 |
| GLOBAL | 6 |
| FUTURE | 2 |
| **Total** | **65** |

Each inventory ID has exactly one class (verified against `SCREEN_INVENTORY.md`). The MVP has **39 standalone routed pages**, not 65. Of these, 2 are `A-blocked` (O29, O30) and the rest are buildable now or gated only for live data.

## Tech Lead decisions (2026-10-21)

1. S01 (welcome) and D10 (event detail) are FUTURE / OPTIONAL.
2. O29/O30 (route-change requests) are MVP requirements, backend-blocked on Agent A capability G7.
3. The existing UX contract documents are kept under their current names. See the directive mapping in [`README.md`](../../README.md#directive-deliverable-mapping).
