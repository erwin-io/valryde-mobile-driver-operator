> 2026-10-23 rapid-delivery update: prior G1/G2/G3/G4 merge blockers below are historical. Current API main exposes all four; Codex implementation and current evidence are in [rapid delivery acceptance](AGENT_D_RAPID_DELIVERY_ACCEPTANCE.md). Tracking and physical-device gates remain.

# Agent D Independent UI Closure Audit

**Checkpoint:** `AGENT_D_UI_INDEPENDENT_SCOPE_COMPLETE`

**Baseline:** merged `origin/main` at `c8d0580e69dabbd28799737e01c84ead93ad5884` (includes PR #7)

## Checklist 38–55

| ID | Independent closure result | Remaining external gate |
|---:|---|---|
| 38 | Complete for available contracts: Driver registration/sign-in, verification and recovery links, account/profile display, password/email change flows, revoked/disabled handling, secure native refresh-token storage, refresh serialization, role navigation, invalid-link, denied and network states. | Owner native-device secure-storage/API test and real SMTP delivery. |
| 39 | Complete static behavior: the Driver chooses only an API-authorized accessible jeepney; the UI does not claim that accessibility proves an active Driver assignment. | G3 authoritative active-assignment marker. |
| 40 | Complete static behavior: server-resolved direct/group route, direction and explicit absent/conflict/inactive states. | G3 for automatic active vehicle identification. |
| 41 | Complete static behavior: official MapLibre geometry, endpoint markers, camera fit, recenter, resize, invalid geometry fallback, teardown and late-async cancellation. No fake live GPS. | Owner Android WebView/WebGL smoke test; Agent B for live position. |
| 42 | No independently implementable live feature. No telemetry is fabricated. | Agent B approved own-location contract and runtime. |
| 43 | No independently implementable live feature. | Agent B compliance status/event contract. |
| 44 | No independently implementable live feature. | Agent B scoped latest-state/realtime contract plus G3 assignment context. |
| 45 | No independently implementable live feature. | Agent B groupmate status/detail contract plus G2 membership reads. |
| 46 | Complete for available contracts, shared with ID 38 and role-adaptive Operator navigation. | Same owner native-device and SMTP gates as ID 38. |
| 47 | Independent counts complete with separately settled Driver, jeepney and group loads; stale refreshes cannot overwrite a newer dashboard. Tracking counts remain absent. | Live G1 verification after Agent A PR #12; Agent B tracking totals. |
| 48 | Complete for available contracts: list/create/edit/detail, application submission and server-owned status, effective route, 401/403/404/409/network states, double-submit and stale-response coverage. | Admin-controlled approval data for live lifecycle acceptance. |
| 49 | Client complete for G1: scoped directory/search/pagination, eligibility, current assignment, confirmation, `driverId` mutation, replacement conflict handling and stale searches. | G1 PR #12 merge/deploy for live pass; G4 for unassign. |
| 50 | Complete for permitted additions: group create/edit and Driver/jeepney additions, confirmation, `driverId`, double-submit and route conflict. | G2 authoritative membership reads/removals. |
| 51 | No independently implementable live feature. | Agent B scoped group tracking contract/runtime. |
| 52 | Complete for available contracts: official route/detail loading and direction assignment to exactly one authorized vehicle/group, with stale/double-submit and error handling. | G7 route-change request contract; Admin-published route data for live success. |
| 53 | No independently implementable live feature. | Agent B compliance overview contract. |
| 54 | No independently implementable live feature. | Agent B transit summary contract. |
| 55 | Complete client workflow: approved-application request action, server-owned request/status/verification rendering, denial/conflict/network handling. | Admin-controlled application/device lifecycle and owner physical-device acceptance. |

## Exact dependency register

| Gate | Needed capability | Affected IDs | Current state |
|---|---|---|---|
| G1 | Operator-scoped Driver directory with `driverId`, eligibility, assignment and group IDs | 47, 49, 50 | Agent A PR #12 open at `92ad34158e1c9fe840b7264b4c3912aec5eeb25b`; deterministic client coverage only. |
| G2 | Authoritative group membership reads and removal mutations | 45, 50 | Contract absent; additions alone are implemented. |
| G3 | Driver self-context identifying confirmed active jeepney assignment | 39, 40, 44 | Contract absent; accessible vehicles are deliberately not labelled as confirmed assignments. |
| G4 | Explicit Driver-to-jeepney unassign mutation | 49 | Contract absent; no speculative control is exposed. |
| G7 | Operator route-change request and lifecycle | 52 | Contract absent; direct direction assignment remains available. |
| Agent B | Own/latest vehicle state, group-scoped snapshots/realtime, compliance/events and summary semantics | 42–45, 47, 51, 53, 54 | Contract/runtime unavailable; no fabricated GPS, status or metrics. |
| Agent A fixtures | Isolated repeatable business-integration data | D11 across 39–41, 47–50, 52, 55 | PR #15 open at `be8d6d038d6f60e168684c28a3a057f78cbf6e89`; executable harness prepared but not run. |

## Owner-device tests remaining

- Install the generated debug APK on an approved physical Android device.
- Verify device-to-API reachability and certificate/network-security configuration in the intended environment.
- Verify native secure-storage restore, refresh rotation, logout revocation and disabled-session recovery across app restarts.
- Verify MapLibre/WebGL route rendering, recenter, resize/orientation and memory behavior on the target device range.
- Verify deep links for email verification, password reset and email change in the installed app.
- Verify accessibility, keyboard, back-button and touch ergonomics on physical hardware.
- Verify real GPS/tracking only after Agent B contracts and hardware are approved; this checkpoint contains no simulated acceptance claim.

No unblocked frontend requirement remains in IDs 38–55. Remaining work is explicitly tied to the contracts, controlled data, external runtime or owner-device gates above.
