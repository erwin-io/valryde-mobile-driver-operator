# VALRYDE — Agent D Driver/Operator Mobile Instructions

**Project:** Valryde — Public Jeepney Route Live Tracking & Monitoring System
**Module owner:** Agent D — Driver/Operator Mobile
**Checklist ownership:** 38–55
**Repository:** `valryde-mobile-driver-operator`
**Canonical workspace:** `C:\Development\valryde\valryde-mobile-driver-operator`

## 1. Mandatory reading order

Before any development work, read and follow:

1. This `AGENTS.md`.
2. The approved VALRYDE Version 1.0 system documentation and 71-item MVP checklist when available.
3. `handoffs/AGENT_D_DRIVER_OPERATOR_HANDOFF.md`.
4. `docs/00_SHARED_AGENT_STATUS_REPORTING_POLICY.md`.
5. `docs/agent-status/AGENT_D_STATUS.md`.
6. The relevant files in `docs/architecture/`, `docs/ui-ux/`, `docs/integration/`, and `docs/testing/`.
7. Current source, README, package manifests, lockfiles, tests, and CI configuration.

If a required source is unavailable or a contract is not approved, record the dependency instead of inventing it.

## 2. Ownership and application boundary

Agent D owns the single Ionic/Angular/Capacitor application named **Valryde Operator** for checklist IDs 38–55.

- `DRIVER` receives assigned-vehicle, route-awareness, permitted group, event, and account experiences.
- `OPERATOR` receives own-fleet, driver, group, transit-assignment, application, GPS-request, and account experiences.
- Use role-adaptive navigation in one application. Do not create separate Driver and Operator apps.
- Backend RBAC and ownership checks are authoritative. Client guards and hidden controls are defense-in-depth only.
- Do not modify backend authorization, DTO, schema, route, realtime, telemetry, or geospatial contracts from this repository.
- Coordinate shared-contract changes through the Tech Lead and the owning backend agent.

## 3. Locked architecture and security constraints

- Installed GPS hardware is the authoritative vehicle-location source; phone GPS must not masquerade as vehicle telemetry.
- Traccar owns raw GPS telemetry and history. Clients never receive Traccar credentials or private service identifiers.
- Client realtime uses an approved Pusher contract plus REST reconciliation when those contracts are available.
- Map views use MapLibre with the approved map style/provider contract.
- Canonical route geometry is Admin-controlled and backend-provided.
- Display backend-provided compliance states only: `UNKNOWN`, `ON_ROUTE`, `OFF_ROUTE`.
- Driver visibility is self plus explicitly permitted same-group resources. Operator visibility is the operator's own fleet.
- Do not persist access tokens or sensitive fleet/location data insecurely. Never commit secrets or credential-bearing environment files.
- Shared contract changes require Tech Lead-approved change control.

## 4. Product and UX baseline

- Use Ionic Framework, Angular, Capacitor, and TypeScript.
- Prefer recognizable native-style Ionic navigation, forms, lists, details, alerts, badges, and status indicators.
- Keep Driver screens uncluttered, glanceable, high-contrast, and low-interaction while driving.
- Avoid decorative gradients, oversized cards, and dashboard ornamentation that obscures operational state.
- Handle loading, empty, stale, offline, denied, error, retry, and reconnect states explicitly.
- Accessibility and safe touch targets are required; audio warnings must be optional and safely mutable.

## 5. MVP scope guardrails

Do not implement or describe as approved MVP scope:

- Dispatch, ride booking, passenger matching, or trip acceptance.
- Fares, payments, wallets, billing, or revenue reporting.
- Driver ratings, scoring, demand prediction, or AI optimization.
- Turn-by-turn voice navigation, traffic-aware routing, or automatic rerouting.
- Passenger counting, seat availability, formal stop workflows, chat, or public tracking links.

## 6. Development workflow

The frontend foundation and D1–D7 are merged. The Tech Lead authorized the D6–D11 Driver/Fleet Expansion under a temporary Codex takeover on 2026-10-22. D8–D10 is in PR #7 on `feat/49-50-driver-group-management`, using Agent A's approved G1 DTO while implementation PR #12 remains unmerged. D11 must wait for fixture PR #15 to merge. G2/G3/G4 and Agent B tracking remain explicit gates. Toolchain: Node `24.15.0` (`.nvmrc`), Angular 22, Ionic 9, Capacitor 8; run `npm run check`.

For an authorized feature slice:

1. Confirm the checklist IDs, stable backend contracts, acceptance criteria, and dependencies.
2. Inspect current source and preserve established conventions.
3. Work on a focused branch from canonical `main`; do not commit directly to protected `main`.
4. Keep changes scoped and add proportional tests for role isolation, failure states, and contract behavior.
5. Run and report actual lint, typecheck, test, and build results.
6. Update the single persistent Agent D status file after meaningful outcomes.
7. Do not self-merge or claim Tech Lead acceptance.

## 7. Mandatory status reporting

Read and comply with `docs/00_SHARED_AGENT_STATUS_REPORTING_POLICY.md`. Maintain only:

`docs/agent-status/AGENT_D_STATUS.md`

Update its snapshot and newest-first activity log after meaningful code, configuration, test, contract, issue, PR, investigation, or blocker outcomes. Preserve history, report failures, separate implementation progress from Tech Lead review decisions, and never include secrets.

## 8. Completion response

At the end of meaningful work report: Agent D and checklist IDs, work completed, files changed, verification evidence, contract/security impact, blockers and operator gates, Git/PR state, status-file path, and the next action.
