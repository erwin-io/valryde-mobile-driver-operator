# VALRYDE — Agent D Driver/Operator Mobile Handoff

**Agent:** D — Driver/Operator Mobile
**Checklist IDs:** 38–55
**Application:** Valryde Operator
**Repository:** `valryde-mobile-driver-operator`
**Canonical workspace:** `C:\Development\valryde\valryde-mobile-driver-operator`
**State:** Development authorized; `UX_CONTRACT_READY` reported (UX acceptance pending); frontend foundation released and submitted for review

## Mission

Build one Ionic/Angular/Capacitor mobile application with secure, role-adaptive Driver and Operator experiences. The backend remains authoritative for authentication, RBAC, ownership, assignments, approved routes, vehicle/GPS workflow state, tracking visibility, and compliance.

## Checklist ownership

| ID | Feature |
|---:|---|
| 38 | Driver Signup / Login / Profile |
| 39 | My Jeepney |
| 40 | Assigned Transit Route & Direction |
| 41 | Driver Route Guidance Map |
| 42 | GPS Device-Based Own Location |
| 43 | Route Compliance Status & Alert |
| 44 | Same-Group Jeepneys Live Map |
| 45 | Groupmate Status & Details |
| 46 | Operator Signup / Login / Profile |
| 47 | Operator Dashboard |
| 48 | My Jeepneys, Applications & Jeepney Details |
| 49 | Driver Management & Assignment |
| 50 | Fleet Group Management |
| 51 | Group Live Tracking |
| 52 | Transit Assignment, Details & Route Change Request |
| 53 | Route Compliance Overview |
| 54 | Transit Summary |
| 55 | GPS Device Setup Request & Status |

## Role experience

- Driver navigation baseline: Home, Route Map, Group, Events, Account.
- Operator navigation baseline: Dashboard, Fleet, Transits, Requests, Account.
- Driver management and Group management remain nested under Fleet to keep primary navigation compact.
- A multi-role account must use explicit authorized context without exposing Operator actions in a Driver-only session.

## Locked integration boundaries

- Agent A owns auth/RBAC, profiles, fleet, routes, assignments, vehicle applications, and GPS setup API contracts.
- Agent B owns Traccar integration, latest state, compliance, tracking history/events, and realtime delivery contracts.
- Agent E/Admin owns canonical route geometry and GPS installation/mapping operations.
- Agent F owns device installation and verification runbooks.
- Tech Lead controls shared DTOs, endpoints, Pusher events/channels, error codes, route thresholds, and mapping state transitions.

The backend snapshot inspected during bootstrap exposes auth, user profile, jeepney, fleet group, public transit, effective route, route assignment, vehicle application, and GPS setup request routes. Tracking/realtime client DTOs and channel contracts are not yet approved in the inspected canonical state. See `docs/integration/API_CONTRACT_MATRIX.md` and `docs/integration/TRACKING_INTEGRATION_GATES.md`.

## Safety and scope

- Installed tracker location is authoritative; phone GPS is not vehicle telemetry.
- Render compliance states supplied by the backend and do not duplicate compliance thresholds client-side.
- Driver data is scoped to self and permitted same-group resources; Operator data is scoped to the operator's own fleet.
- Do not expose provider credentials, private identifiers, or unrestricted channels.
- No dispatch, booking, fares, payments, revenue reporting, driver scoring, turn-by-turn navigation, traffic routing, or automatic rerouting.

## Implementation sequence after authorization

1. Shared auth/session shell and strict role context/navigation.
2. Driver assigned vehicle and effective route views.
3. Driver GPS-device route map and backend compliance warnings.
4. Same-group tracking and groupmate details after scoped contracts stabilize.
5. Operator dashboard, fleet, drivers, groups, and assignments.
6. Approved transit assignment/change request and vehicle/GPS application flows.
7. Role-isolation, offline/reconnect, stale-state, and acceptance tests.

## Frontend execution checkpoints

1. `UX_CONTRACT_READY` — screen inventory, role navigation/flows, design system/components, Agent A dependencies, Agent B gates and screen acceptance criteria. Reported; detailed acceptance pending.
2. Application scaffold and shared shell (`FRONTEND_FOUNDATION_READY`) — released 2026-10-21. Current checkpoint.
3. Authorized vertical feature slices — follow stable contracts and checklist priorities.

## Reporting

Mandatory policy: `docs/00_SHARED_AGENT_STATUS_REPORTING_POLICY.md`
Canonical status: `docs/agent-status/AGENT_D_STATUS.md`

Do not create separate status histories. Do not claim Tech Lead acceptance or hardware verification without evidence.

## Workspace correction history

The initial bootstrap was mistakenly prepared under `C:\Development\valryde\valryde-mobile-operator` following an incorrect Tech Lead path. That folder remains untouched as a recoverable source. On 2026-10-21 the documentation was reconciled into this existing canonical Git repository; the incorrect path is retained here as historical evidence, not as an active workspace.

## Next action

Tech Lead reviews the frontend foundation PR and `docs/ui-ux/SURFACE_CLASSIFICATION.md`. Do not implement feature slices until the next frontend checkpoint is explicitly released.
