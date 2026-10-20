# Screen and User-Flow Acceptance Criteria

**Checkpoint:** `UX_CONTRACT_READY`
**Implementation evidence:** Not yet applicable; criteria are the contract for later tests.

## Criteria applied to every protected screen

Each screen must verify, as applicable:

1. Authorized happy path with server-scoped data.
2. Loading/skeleton without duplicate requests or protected-content flash.
3. Legitimate empty state distinct from permission failure.
4. Validation and machine-readable server errors.
5. `401` session recovery/failure behavior.
6. `403`/out-of-scope behavior that clears protected cached state.
7. Offline, stale and retry/reconciliation behavior.
8. Dynamic type, screen reader labels, focus, contrast and 44 px minimum targets; 48 px for primary Driver map controls.
9. No secrets, provider-private identifiers or cross-role/cross-owner data in UI, logs, URLs or storage.

## Shared/auth screens

| ID | Acceptance criteria |
|---|---|
| S01 | Offers sign-in/registration; accurately describes Driver/Operator product; no booking/fare claims; accessible primary actions. |
| S02 | Valid sign-in resolves user/roles before mounting tabs; invalid/unverified/revoked states are distinct; duplicate submission prevented; password never logged. |
| S03 | Only approved self-register roles shown; selection does not itself grant role; back navigation preserves no secret state. |
| S04 | Driver fields follow approved DTO; validation and duplicate-email responses shown; success proceeds to verification, not assignment. |
| S05 | Operator fields follow approved DTO; success does not imply vehicle activation; verification path is clear. |
| S06 | Valid verification succeeds once; expired/invalid/rate-limited resend handled; account enumeration avoided according to contract. |
| S07 | Recovery request uses privacy-safe response for known/unknown email; rate limit and offline handled. |
| S08 | Approved challenge and password rules enforced; expired/used token handled; success returns to sign-in/session flow. |
| S09 | Shows only server-authorized roles; role switch clears previous scope/stacks/subscriptions before destination data renders. |
| S10 | Shows permitted profile/role and settings; offline data labeled; sign-out remains reachable. |
| S11 | Only editable fields shown; invalid/server-conflict states preserve safe input; success reconciles `GET /auth/me`. |
| S12 | Password/email flows require approved verification; session invalidation is explained; sensitive values never persist in draft/log. |
| S13 | Cancel retains session; confirm revokes/clears protected state and subscriptions before returning to public shell. |

## Driver screens

| ID | Acceptance criteria |
|---|---|
| D01 | Shows only assigned vehicle/effective route and tracker/compliance state; priority issue is first; UNKNOWN/stale/offline are never healthy/live; no assignment uses D11. |
| D02 | Plate/color/approval/tracker summary comes from scoped server data; nonassigned vehicle access denied and removed; no Admin controls. |
| D03 | Uses backend effective route; null and route conflict are explicit; official geometry/details are read-only; inactive/unusable route handled. |
| D04 | Renders approved route and authorized tracker/group snapshot; recenter/follow works without phone telemetry substitution; disconnect/reconnect reconciles; out-of-scope markers disappear. |
| D05 | Displays safe own-vehicle fields, location age and compliance; sheet is dismissible/focus-safe; stale coordinate never appears current. |
| D06 | Appears only for backend OFF_ROUTE; stays visible while off route; mute affects audio only; newer ON_ROUTE/UNKNOWN transition handled; duplicates do not retrigger audio. |
| D07 | Map/list contains same permitted group only; loading/empty/no-group distinct; revoked membership clears data and detail route. |
| D08 | Shows only allowlisted groupmate detail; direct link cannot bypass group scope; stale/last-seen state accurate. |
| D09 | Shows only scoped approved event types in newest-first/paginated order; empty and retention boundary are explained. |
| D10 | Detail belongs to authorized Driver scope; transition/time/route context matches event contract; missing/expired event handled. |
| D11 | Clearly states no assigned jeepney/route; offers only approved operator/contact guidance; does not fabricate map/tracker data. |
| D12 | Distinguishes unassigned, unmapped, no fix, stale, offline and service failure only as supported; exposes appropriate retry/owner action. |

## Operator screens

| ID | Acceptance criteria |
|---|---|
| O01 | Counts are own-fleet only and share a snapshot time; unknown/stale bucket prevents misleading totals; each actionable count drills into a scoped view. |
| O02 | Shows Jeepneys/Drivers/Groups/live tracking entries with scoped counts; empty onboarding follows activation sequence; no revenue/dispatch modules. |
| O03 | Lists only owned jeepneys with approved statuses; filter/search and pagination follow API; cross-owner record never appears. |
| O04 | Permitted fields validate; duplicate/conflict/forbidden errors shown; success reconciles server record and does not imply approval. |
| O05 | Combines only authorized vehicle/application/GPS/assignment summaries; partial service failure identified; actions reflect eligibility without replacing server enforcement. |
| O06 | Only editable owned fields enabled; canonical/admin-controlled fields absent; success refetches detail. |
| O07 | Eligible application submits once; existing/pending application handled; lifecycle and next action shown without Admin review actions. |
| O08 | Lists associated/permitted drivers with association/assignment state; privacy-safe empty/search/error behavior; cross-operator access denied. |
| O09 | Uses approved verified-email association flow; avoids account enumeration; pending/duplicate/wrong-role states handled. |
| O10 | Shows permitted driver/group/jeepney relationship; direct-link cross-owner denial clears content; assignment action uses O11. |
| O11 | Shows eligible owned vehicles only; conflicts/unassign semantics follow contract; confirmation names driver/vehicle; result reconciles both records. |
| O12 | Lists owned groups/counts; empty create action authorized; cross-owner groups never appear. |
| O13 | Validates group data and prevents duplicate submit; success opens server-created group. |
| O14 | Shows current owned group members/vehicles and tracking entry; partial/removed membership reconciles; cross-owner denied. |
| O15 | Edits only permitted group fields; unsaved guard works; success refetches. |
| O16 | Eligible associated drivers/owned vehicles only; add/remove behavior matches approved contract; duplicate/conflict and partial failure clear. |
| O17 | Displays only own-fleet/group live state; filters do not widen scope; reconnect reconciles; stale and unauthorized markers removed. |
| O18 | Lists approved routes relevant/available to Operator and scoped summary only where contracted; inactive state clear. |
| O19 | Official route/direction/geometry is read-only; own assignments separated from global route data; assign entry respects eligibility. |
| O20 | Selects approved direction and eligible vehicle/group; existing effective assignment/conflict shown; success refetches effective routes. |
| O21 | Displays official line plus scoped own vehicles only; route color and compliance semantics remain distinct; map has list fallback. |
| O22 | Counts use explicit assigned denominator and snapshot time; unknown prevents false online/offline/compliance totals; drill-down scoped. |
| O23 | Buckets own fleet into backend states without client recomputation; active deviations distinct from history; stale/unknown explicit. |
| O24 | Shows current server compliance, route, freshness and approved event context; no private provider data; revoked vehicle scope clears view. |
| O25 | Separates vehicle applications, GPS setup and route-change requests; badges use server states; unavailable flow is gated, not faked. |
| O26 | Lists only owned GPS requests with accurate state and update time; safe filters/empty state; no Admin operations. |
| O27 | Eligible owned vehicle and required fields only; preferred date/timezone contract observed; success opens reconciled request detail. |
| O28 | Timeline uses exact server transitions and safe rejection/mapping/verification fields; does not expose credentials/IMEI unless explicitly approved; no arbitrary transitions. |
| O29 | Lists own route requests once endpoint exists; absent contract keeps feature disabled/hidden with documented gate, not local mock authority. |
| O30 | Submits only approved descriptive fields; cannot edit canonical geometry; validation/status contract followed; success reconciles. |

## Global state surfaces

| ID | Acceptance criteria |
|---|---|
| G01 | No protected tab flashes before session/role resolution; slow/failure path is accessible and recoverable. |
| G02 | Offline banner is persistent, shows last sync, disables mutations and removes “live” wording. |
| G03 | Reconnect state is nonblocking; REST reconciliation completes before data is labeled live. |
| G04 | Protected content is cleared before denial explanation; safe role-root navigation available. |
| G05 | Session-expired surface contains no protected data and returns to sign-in; refresh loops are bounded. |
| G06 | Error identifies affected operation and retry/owner action without leaking internals or secrets. |
| G07 | Empty state explains the actual condition and exposes at most one authorized primary action. |
| G08 | Skeleton matches layout, is not announced as real data, and prevents duplicate mutation. |
| G09 | Leaving dirty form requires explicit discard/stay choice; successful submit does not prompt. |
| G10 | Stale marker/status includes last update and cannot be confused with a fresh live state. |

## End-to-end user-flow acceptance

### Driver auth and assignment

Register → verify → sign in → no-assignment state → server-authorized association/assignment appears after reconciliation. Driver cannot access Operator routes or a non-group vehicle by URL.

### Driver compliance and recovery

Assigned tracker/route → REST snapshot → authorized realtime → ON_ROUTE → backend OFF_ROUTE warning → duplicate ignored → validated re-entry → warning clears. Socket gap and app resume converge through REST without stale marker leakage.

### Operator onboarding

Register → verify → create jeepney → submit vehicle application → observe review state → submit GPS request when eligible → observe lifecycle. No client action performs Admin approval, mapping, verification or direct activation.

### Operator fleet isolation

Associate Driver → assign owned jeepney → create group → add permitted members → assign approved direction. Cross-operator vehicle/driver/group IDs are denied and never cached/rendered.

### Accessibility and device behavior

Critical flows pass screen-reader navigation, dynamic type, keyboard/focus order, high contrast, reduced motion, orientation change and Capacitor background/resume reconciliation checks on supported targets.

## Planned evidence after implementation

- Unit: guards, reducers/state machines, form validation, status/freshness presenters.
- Component: all loading/empty/error/denied/stale states and accessibility.
- Integration: typed Agent A API adapter, secure session behavior, Agent B snapshot/realtime reconciliation.
- End-to-end: role isolation, Driver compliance sequence, Operator application/GPS workflow.
- Manual/device: map gestures, lifecycle resume, audio mute/warning, dynamic type and assistive technology.
