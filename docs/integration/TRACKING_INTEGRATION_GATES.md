# Agent B Tracking Integration Gates

**Checkpoint:** `UX_CONTRACT_READY`
**Status:** UX behavior is defined; implementation remains gated on approved public contracts.

The inspected backend included a proposed internal Tracking Bridge/latest-state contract, explicitly not an approved public DTO or Pusher contract. Agent D must never bind to internal tables, Traccar provider IDs, service sessions or proposed-only field names.

## Gate matrix

| Gate | Required public contract/evidence | Driver consumers | Operator consumers | Owner | Current state |
|---|---|---|---|---|---|
| T01 Latest-state DTO | Client-safe fields, enums, timestamps, revision, freshness/location semantics; no service identifiers | D01, D04–D06, D12 | O01, O17, O21–O24 | Agent B + Tech Lead | BLOCKED |
| T02 Driver own-state REST | Assigned-vehicle-only endpoint and negative auth tests | D01, D04–D06 | — | Agent B/A | BLOCKED |
| T03 Driver same-group snapshot | Authorized group snapshot, safe driver/vehicle fields, membership revocation behavior | D04, D07–D08 | — | Agent B/A | BLOCKED |
| T04 Operator fleet snapshot | Own-fleet/group snapshot with filters and cross-operator denial tests | — | O01, O17, O21 | Agent B/A | BLOCKED |
| T05 Compliance current state | Backend `UNKNOWN`/`ON_ROUTE`/`OFF_ROUTE`, timestamps and route-direction identity | D01, D04–D06 | O01, O22–O24 | Agent B | BLOCKED |
| T06 Compliance events/history | Scoped list/detail, event type/time, pagination/retention and privacy | D09–D10 | O23–O24 | Agent B | BLOCKED |
| T07 Pusher authorization | Private channel auth endpoint, audience/channel scopes and negative tests | D04, D07 | O17, O21, O23 | Agent B/Tech Lead | BLOCKED |
| T08 Realtime event schema | Event name/version, payload allowlist, revision/order, upsert/remove/invalidate semantics | D04, D07 | O17, O21, O23 | Agent B/Tech Lead | BLOCKED |
| T09 REST reconciliation | Snapshot revision/cursor, reconnect algorithm, missed-event recovery and atomic scope replacement | D04, D07 | O17, O21, O23 | Agent B | BLOCKED |
| T10 Availability/error taxonomy | Distinguish stale fix, invalid/no fix, tracker offline, bridge outage, API outage where knowable | D01, D04, D12 | O01, O17, O23 | Agent B | BLOCKED |
| T11 Route geometry compatibility | Approved GeoJSON type/order/SRID and route-direction identifier shared with tracking state | D03–D04 | O19–O21 | Agent A/B | PARTIAL |
| T12 Lifecycle behavior | App background/resume subscription policy and REST reconcile requirement | D04, D07 | O17, O21, O23 | Agent B/D review | BLOCKED |

## Required client-safe conceptual fields

The exact names remain contract-controlled. Agent D needs the concepts below, not Agent B's internal database record:

- Business jeepney identifier and safe plate/physical color.
- Route and direction business identifiers needed to bind the official polyline.
- Latitude/longitude only when the current state is eligible for the intended audience.
- Fix/observation time and a clear freshness/location-status interpretation.
- Tracker connectivity and motion state where authoritative.
- Backend compliance state.
- Monotonic revision or equivalent ordering token.
- Audience-safe last-updated timestamp.
- Explicit removal/invalidation signal or deterministic snapshot replacement rule.

No Traccar credentials, session cookies, raw provider attributes, private service IDs, database mapping IDs or unrestricted driver/operator data.

## Client state machine

```text
IDLE
  → SNAPSHOT_LOADING
  → SNAPSHOT_READY
  → SUBSCRIBING
  → LIVE
  ├─ connection loss → RECONNECTING → SNAPSHOT_RECONCILING → LIVE
  ├─ authorization loss → SCOPE_REVOKED → clear protected state
  ├─ session expiry → AUTH_RECOVERY → reconcile or sign in
  └─ app background/resume → SNAPSHOT_RECONCILING → LIVE
```

Realtime events are applied only when authorized and newer than the current entity state. A gap or unknown order forces REST reconciliation.

## Rendering invariants

- Phone GPS never substitutes for tracker state.
- Client never computes authoritative compliance from the displayed line.
- `UNKNOWN`, stale, invalid or unavailable data cannot appear ON_ROUTE or “live.”
- If retained last-known coordinates may be displayed, they use a visibly stale treatment and timestamp under an explicit contract.
- Realtime never replaces REST reconciliation.
- Role switch, logout, assignment/group removal or revoked authorization clears affected markers/details immediately.
- Driver never sees non-group vehicles; Operator never sees another operator's fleet.
- Route color is not used as compliance color.

## OFF_ROUTE warning contract

- Start visible warning only when the backend reports `OFF_ROUTE`.
- Optional audio warning may start only on a transition into `OFF_ROUTE`, subject to platform audio/lifecycle review.
- Mute affects audio only, not the visible warning.
- Clear only after a newer backend state reports validated re-entry (`ON_ROUTE`) or becomes `UNKNOWN`; UNKNOWN uses its own caution treatment.
- Avoid repeated audio on duplicate/out-of-order events.
- Background notification behavior is out of scope unless separately approved.

## Reconciliation test evidence required from Agent B

1. Initial authorized snapshot for Driver self and same group.
2. Cross-group Driver and cross-operator access denied.
3. Newer state accepted; older/duplicate state cannot roll UI backward.
4. Vehicle removed when assignment/group/eligibility changes.
5. Stale transition and provider outage do not preserve a false live state.
6. Socket/Pusher gap followed by REST convergence.
7. Compliance OFF_ROUTE and validated re-entry sequence.
8. Payload allowlist excludes private identifiers/secrets.

## Implementation release condition

Map shell/layout may be scaffolded after UX approval, but live tracking adapters, subscriptions, compliance warning logic and provider-derived state must wait until the corresponding gates above are Tech Lead-approved.
