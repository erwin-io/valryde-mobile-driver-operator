> 2026-10-23 rapid-delivery update: prior G1/G2/G3/G4 merge blockers below are historical. Current API main exposes all four; Codex implementation and current evidence are in [rapid delivery acceptance](../testing/AGENT_D_RAPID_DELIVERY_ACCEPTANCE.md). Tracking and physical-device gates remain.

# Agent A API Dependency Matrix

**Checkpoint:** `UX_CONTRACT_READY`
**Consumer:** Agent D — `valryde-mobile-driver-operator`
**Authority:** Agent A / Tech Lead-approved OpenAPI and RBAC behavior

Inspected read-only backend: `valryde-api` at HEAD `711f4c45967e192be155e05e72714b99645ecc7d` on 2026-10-21. Paths use base `/api`.

## Readiness legend

- **OBSERVED:** route exists in inspected backend source/documentation; DTO and mobile suitability still require OpenAPI confirmation.
- **PARTIAL:** some endpoints exist, but the complete screen/flow contract is missing.
- **MISSING:** no supporting route was confirmed.
- **AGENT B GATE:** tracking/compliance/realtime authority belongs to Agent B and is detailed separately.

## Authentication, role and account dependencies

| UX screens | Capability | Endpoint(s) observed | Readiness | Required confirmation / blocker owner |
|---|---|---|---|---|
| S02 | Sign in | `POST /auth/login`, `POST /auth/google` | OBSERVED | Request/response DTO, verified-email errors, role claims, Google native flow; Agent A |
| S03–S05 | Register by role | `POST /auth/register` | OBSERVED | Allowed `DRIVER`/`OPERATOR` role field, role-specific profile fields, duplicate account errors; Agent A |
| S06 | Verify/resend email | `POST /auth/verify-email`, `POST /auth/resend-verification` | OBSERVED | Code/link payload, expiry and rate-limit error semantics; Agent A |
| S07–S08 | Recovery | `POST /auth/forgot-password`, `POST /auth/reset-password` | OBSERVED | Challenge delivery/expiry, password rules, anti-enumeration response; Agent A |
| G01, S09 | Restore session and role context | `POST /auth/refresh`, `GET /auth/me` | OBSERVED | Token transport/rotation, authorized roles array, active-role claim/context behavior; Agent A/Tech Lead |
| S10–S12 | Profile/security | `GET/PATCH /auth/me`; change password/email endpoints | OBSERVED | Editable field allowlist, verified email transition, session invalidation; Agent A |
| S13 | Sign out | `POST /auth/logout` | OBSERVED | Revocation response, all-device vs current-device semantics; Agent A |

## Driver dependencies

| UX screens | Capability | Endpoint(s) observed | Readiness | Required confirmation / blocker owner |
|---|---|---|---|---|
| D01–D02, D11 | Assigned jeepney / no assignment | `GET /jeepneys` | PARTIAL | Driver-scoped query/result, single assignment representation, approval/tracker-safe fields; Agent A |
| D03 | Effective route | `GET /jeepneys/{jeepneyId}/effective-route` | OBSERVED | Driver authorization, null/unassigned and `409 ROUTE_ASSIGNMENT_CONFLICT` payload; Agent A |
| D03–D04 | Public route/direction detail and geometry | `GET /transit-routes/{routeId}` | OBSERVED | Direction identifiers, GeoJSON coordinate order, status/color/corridor exposure; Agent A |
| D04–D10, D12 | Location/compliance/group/events | None approved for clients in inspected state | AGENT B GATE | See tracking gates; Agent B/Tech Lead |
| D07–D08 | Driver group/groupmates | `GET /fleet-groups` may exist but Driver response contract is not confirmed | PARTIAL | Driver's current group, allowed member-safe details, cross-group negative tests; Agent A + B for live state |

## Operator fleet dependencies

| UX screens | Capability | Endpoint(s) observed | Readiness | Required confirmation / blocker owner |
|---|---|---|---|---|
| O02–O06 | List/create/update own jeepneys | `GET/POST /jeepneys`, `PATCH /jeepneys/{jeepneyId}` | OBSERVED | Pagination/search, ownership errors, editable field allowlist, physical color format, state enums; Agent A |
| O05, O07, O25 | Vehicle application list/detail/submit | `GET/POST /vehicle-applications` | PARTIAL | Filter/detail shape, eligibility rules, duplicate/retry semantics, application-to-jeepney relation; Agent A |
| O08–O10 | List/detail associated drivers | `POST /driver-associations` observed; list/detail not confirmed | PARTIAL | Association/invitation states, verified email workflow, scoped list/detail endpoints; Agent A |
| O09 | Associate Driver | `POST /driver-associations` | OBSERVED | Whether operator or driver initiates, request DTO, verification/acceptance state, privacy-safe lookup errors; Agent A |
| O11 | Assign Driver | `POST /jeepneys/{jeepneyId}/driver-assignment` | OBSERVED | Eligible driver list, unassign/change semantics, conflict codes, atomic result; Agent A |
| O12–O15 | List/create/update groups | `GET/POST /fleet-groups`, `PATCH /fleet-groups/{groupId}` | OBSERVED | Group DTO, pagination, name rules, ownership errors; Agent A |
| O14, O16 | Manage group members | `POST /fleet-groups/{groupId}/drivers`, `POST /fleet-groups/{groupId}/jeepneys` | PARTIAL | Removal endpoints/semantics not confirmed, current membership detail, duplicate/conflict behavior; Agent A |
| O17 | Fleet live map | No client tracking snapshot confirmed | AGENT B GATE | Operator-owned fleet REST/realtime scope; Agent B/Tech Lead |

## Operator transit/compliance dependencies

| UX screens | Capability | Endpoint(s) observed | Readiness | Required confirmation / blocker owner |
|---|---|---|---|---|
| O18–O21 | Browse route/direction detail | `GET /transit-routes`, `GET /transit-routes/{routeId}` | OBSERVED | Pagination/search, active directions, geometry/color fields, inactive-route rules; Agent A |
| O20 | Assign approved direction | `POST /route-assignments` | OBSERVED | Vehicle vs group target DTO, eligibility, replacement/deactivation semantics, conflict errors; Agent A |
| O19–O20 | Resolve effective route | `GET /jeepneys/{jeepneyId}/effective-route` | OBSERVED | Direct-over-group precedence is server-owned; result/conflict DTO; Agent A |
| O22 | Transit summary | None confirmed | MISSING | Scoped assigned/online/moving/stopped/offline/deviating aggregate and freshness; Agent A + B |
| O23–O24 | Compliance overview/detail | None confirmed | AGENT B GATE | Scoped status/event APIs; Agent B/Tech Lead |
| O29–O30 | Route add/change requests | None confirmed | MISSING | Submit/list/detail DTO, request type/status/review-safe fields; Agent A |

## Operator GPS setup dependencies

| UX screens | Capability | Endpoint(s) observed | Readiness | Required confirmation / blocker owner |
|---|---|---|---|---|
| O26–O28 | List/submit own GPS requests | `GET/POST /gps-setup-requests` | OBSERVED | Query/detail shape, preferred date format/timezone, safe mapping/verification fields, rejection reason; Agent A |
| O28 | Observe request lifecycle | same list route; Admin transition routes exist | PARTIAL | Operator-readable timeline/detail endpoint and allowed fields; Agent A |
| None in Operator app | Approve/reject/map/verify | Admin-only routes exist | EXCLUDED | Never expose Admin mutations to Agent D UI |

## Dashboard and aggregate dependencies

| UX screen | Required aggregate | Readiness | Contract requirements |
|---|---|---|---|
| O01 | total/assigned, online/offline, moving/stopped, route deviations | MISSING | One server-scoped snapshot time, state definitions, double-counting rules, stale/unknown bucket |
| O22 | per-route/group counts | MISSING | Route-direction identity, assigned denominator, tracker/compliance freshness, unknown bucket |
| O23 | current compliance buckets/deviations | AGENT B GATE | Server-produced compliance only, event/current-state distinction |

## Cross-cutting API requirements

Before implementation, Agent D needs:

1. Approved OpenAPI export or equivalent typed schemas for every consumed endpoint.
2. Stable machine-readable error envelope and codes, including auth/session, forbidden ownership, validation, state conflict, route assignment conflict and tracking unavailable cases.
3. Pagination/filter/sort conventions for list screens.
4. Time format and timezone rules; all operational timestamps must be unambiguous.
5. ID type/serialization rules; do not parse large provider identifiers as unsafe numbers.
6. Refresh-token transport and approved OS-backed mobile storage strategy.
7. CORS/native WebView environment rules and canonical API base configuration.
8. Negative authorization tests for Driver same-group and Operator own-fleet isolation.

## Client consumption rules

- Build a typed adapter from the approved contract; page components do not construct ad-hoc API shapes.
- Never recreate effective-route precedence, approval eligibility, role authorization or compliance thresholds in the client.
- `401`, `403`, `404`, `409`, validation and provider-unavailable outcomes remain distinct.
- After a mutation, reconcile authoritative server state before showing durable success.
- Missing endpoints are integration dependencies, not permission to implement business authority locally.
