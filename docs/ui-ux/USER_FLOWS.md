# Role-Specific Navigation and User Flows

**Checkpoint:** `UX_CONTRACT_READY`

## Session and role resolution

```text
Launch
  → restore refresh-session material from approved secure storage
  → refresh / fetch current user
  ├─ unauthenticated → Welcome → Sign in or Register
  ├─ one authorized role → matching role shell
  └─ multiple authorized roles → Role chooser → matching role shell
```

Client guards prevent accidental navigation, but every request remains subject to backend authorization. A role switch unsubscribes realtime, clears role-scoped caches and navigation stacks, fetches the new authorized snapshot, then mounts the destination tabs.

## Driver first-use flow

```text
Welcome → Driver registration → Verify email → Sign in
  → Driver Home
  ├─ no operator association → association guidance
  ├─ associated, no jeepney → No Assignment
  ├─ jeepney, no effective route → vehicle shown + route unavailable
  └─ jeepney + route → tracker/compliance state → Route Map
```

No screen promises that registration creates an operator association, jeepney assignment, route assignment, vehicle approval, or active tracker.

## Driver route-awareness flow

```text
Driver Home → Route Map
  → REST snapshot
  → render official route + tracker-derived current state
  → subscribe to authorized realtime
  ├─ ON_ROUTE → normal route status
  ├─ OFF_ROUTE → visible warning + optional audio
  ├─ UNKNOWN / stale → unknown-state treatment; no false live marker
  └─ disconnect → reconnect indicator → REST reconcile → resume
```

Map controls: recenter once, follow/unfollow, own/group visibility, groupmate selection, and mute/unmute. No destination input, turn list, traffic layer, route optimization, or automatic rerouting.

## Driver group flow

```text
Group tab → scoped snapshot → map/list
  → select permitted groupmate → Groupmate Detail
  → authorization/membership changes
  → remove inaccessible marker/detail immediately on reconciliation
```

## Operator onboarding and activation flow

```text
Operator registration → Verify email → Sign in
  → Dashboard (empty-state onboarding)
  → Add Jeepney
  → Submit individual Vehicle Application
  → wait for Admin review
  → Submit GPS Setup Request when permitted
  → PENDING → APPROVED → SCHEDULED → INSTALLED
  → Admin mapping/verification
  → assign approved route direction / driver / group as eligible
  → backend determines operational activation
```

The client never provides Admin approval, device mapping, installation verification, or direct activation actions.

## Operator driver assignment flow

```text
Fleet → Drivers → Associate Driver
  → backend-verified association
  → Driver Detail → Assign Jeepney
  → choose eligible owned vehicle
  → confirm → submit
  ├─ success → refetch driver + vehicle summaries
  └─ conflict/forbidden → show machine-readable outcome; do not fake success
```

## Operator group management flow

```text
Fleet → Groups → Create/Edit Group
  → Manage Members
  → add eligible associated drivers / owned vehicles
  → reconcile group detail and affected tracking scope
```

## Operator transit assignment flow

```text
Transits → Transit Detail → choose approved direction
  → Assign → select eligible owned vehicle or group
  → review current/effective assignment → submit
  → refetch effective routes
```

Official geometry is read-only. To request a route addition/change:

```text
Requests → Route Change Requests → New Request
  → describe requested change → submit → track review state
```

This flow remains gated until Agent A provides an approved contract.

## Operator GPS request flow

```text
Requests → GPS Setup → New Request
  → select eligible owned jeepney
  → confirm plate/route context/contact/preferred date
  → submit → Request Detail timeline
```

The timeline uses server state and last update. Rejection includes only the approved safe explanation. Mapping identifiers/credentials remain private.

## Offline, resume and session failure

- Loss of network: retain only approved last snapshot, label it stale/offline, disable mutations, and avoid “live” language.
- App resume: refresh session if needed, refetch role-authorized REST snapshot, then resume realtime.
- Realtime gap: reconcile REST before treating new events as current.
- `401`: attempt the approved single refresh path; on failure, clear protected state and return to sign-in.
- `403`: clear the affected scoped resource and return to a safe role landing; do not retry as another role implicitly.
- Role/assignment/group change: invalidate cached entities, map markers, details and navigation entries that are no longer authorized.

## Form behavior

- Validate required format locally for fast feedback; backend remains authoritative.
- Disable duplicate submit while a request is active.
- Preserve safe, non-secret draft fields only when approved.
- Use an unsaved-change guard for multi-field create/edit pages.
- After success, show the server result and reconcile; never rely only on optimistic state.
