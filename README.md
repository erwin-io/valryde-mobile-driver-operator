# Valryde Operator (`valryde-mobile-driver-operator`)

Valryde Operator is the shared Ionic/Angular/Capacitor mobile application planned for VALRYDE Driver and Operator users. It uses role-adaptive navigation in one codebase and consumes server-authorized VALRYDE API and tracking contracts.

## Repository

- Local workspace: `C:\Development\valryde\valryde-mobile-driver-operator`
- GitHub: `https://github.com/erwin-io/valryde-mobile-driver-operator`
- Expected remote: `https://github.com/erwin-io/valryde-mobile-driver-operator.git`
- Default branch: `main`

Do not initialize a replacement repository, clone over this workspace, or commit directly to protected `main`.

## Current state

The Tech Lead authorized Agent D development on 2026-10-21. The frontend foundation and D1–D5 account/fleet/GPS/transit slices are merged. D6–D11 Driver/Fleet Expansion is active; the current focused branch adds the Driver authorized-vehicle route/direction detail, static official MapLibre geometry, and the Android Capacitor platform while preserving G3 and tracking gates.

## Ownership

- Agent: D — Driver/Operator Mobile
- Stable MVP checklist IDs: 38–55
- Roles: `DRIVER`, `OPERATOR`
- Canonical status: `docs/agent-status/AGENT_D_STATUS.md`
- Shared reporting policy: `docs/00_SHARED_AGENT_STATUS_REPORTING_POLICY.md`
- Agent handoff: `handoffs/AGENT_D_DRIVER_OPERATOR_HANDOFF.md`

## Planned stack

- Ionic Framework
- Angular
- Capacitor
- TypeScript
- MapLibre for approved map views

Versions are pinned exactly in `package.json` and locked by `package-lock.json`.

## Architecture boundaries

- One application, with strict role-adaptive navigation and backend-authoritative RBAC.
- Installed GPS hardware, not phone GPS, is the authoritative vehicle-location source.
- Traccar remains private behind backend/Tracking Bridge contracts.
- Realtime requires an approved scoped Pusher contract and REST reconciliation.
- Admin owns canonical route geometry; Operator workflows may assign approved directions or request changes.
- No booking, dispatch, fare, revenue, or driver-scoring features are approved for MVP.

## Documentation

- `docs/architecture/ROLE_MATRIX.md`
- `docs/architecture/FLEET_MANAGEMENT_MODULES.md`
- `docs/ui-ux/ROLE_BASED_NAVIGATION.md`
- `docs/ui-ux/SCREEN_INVENTORY.md`
- `docs/ui-ux/USER_FLOWS.md`
- `docs/ui-ux/DESIGN_SYSTEM.md`
- `docs/ui-ux/IONIC_COMPONENT_CATALOG.md`
- `docs/integration/API_CONTRACT_MATRIX.md`
- `docs/integration/VEHICLE_DRIVER_ASSOCIATION_WORKFLOW.md`
- `docs/integration/GPS_APPLICATION_WORKFLOW.md`
- `docs/integration/TRACKING_INTEGRATION_GATES.md`
- `docs/testing/SCREEN_AND_USER_FLOW_ACCEPTANCE_CRITERIA.md`
- `docs/ui-ux/SURFACE_CLASSIFICATION.md`
- `docs/architecture/BUNDLE_BUDGET.md`
- `docs/testing/ACCOUNT_SESSION_INTEGRATION.md`
- `docs/evidence/frontend-foundation/` (screenshot evidence)

## Directive deliverable mapping

The Agent D development directive (§11) lists documents by alternate names. On Tech Lead decision (2026-10-21), the accepted UX contract files keep their names and are not duplicated.

| Directive deliverable | Canonical document |
|---|---|
| `docs/ui-ux/DESIGN_SYSTEM.md` | `docs/ui-ux/DESIGN_SYSTEM.md` |
| `docs/ui-ux/ROLE_NAVIGATION.md` | `docs/ui-ux/ROLE_BASED_NAVIGATION.md` |
| `docs/ui-ux/SCREEN_INVENTORY.md` | `docs/ui-ux/SCREEN_INVENTORY.md`; scope per surface in `docs/ui-ux/SURFACE_CLASSIFICATION.md` |
| `docs/ui-ux/OPERATOR_FLOWS.md` | `docs/ui-ux/USER_FLOWS.md`: "Operator …" sections, plus "Session and role resolution" and "Offline, resume and session failure" |
| `docs/ui-ux/DRIVER_FLOWS.md` | `docs/ui-ux/USER_FLOWS.md`: "Driver …" sections, plus the same shared sections |
| `docs/ui-ux/COMPONENT_CATALOG.md` | `docs/ui-ux/IONIC_COMPONENT_CATALOG.md` |
| `docs/ui-ux/VISUAL_ACCEPTANCE.md` | `docs/ui-ux/DESIGN_SYSTEM.md` (principles, semantic states, accessibility), `docs/testing/SCREEN_AND_USER_FLOW_ACCEPTANCE_CRITERIA.md` ("Accessibility and device behavior"), and screenshot evidence in `docs/evidence/` |
| `docs/integration/API_CONTRACT_MATRIX.md` | `docs/integration/API_CONTRACT_MATRIX.md` |
| `docs/integration/TRACKING_INTEGRATION_GATES.md` | `docs/integration/TRACKING_INTEGRATION_GATES.md` |
| `docs/testing/ACCEPTANCE_MATRIX.md` | `docs/testing/SCREEN_AND_USER_FLOW_ACCEPTANCE_CRITERIA.md` |

## Setup status

Requires Node `24.15.0` (see `.nvmrc`; Angular CLI 22 needs `^22.22.3` or `>=24.15.0`).

```bash
npm ci
npm run check   # lint, unit tests, production build
npm start       # dev server; /foundation/driver and /foundation/operator preview role homes (development only)
npm run cap:sync
```

The app calls the API at `/api` (`src/environments`). `npm start` proxies `/api` to the Agent A dev API at `http://127.0.0.1:3000` (`proxy.conf.mjs`); set `VALRYDE_API_URL` to target another instance. Agent A's CORS allows `http://localhost:4200` and `http://localhost:8100`, and its email links must point at the origin you serve.

Sessions: access tokens stay in memory. On native builds only the refresh token is persisted, in OS-backed secure storage (iOS Keychain `whenUnlockedThisDeviceOnly`, never iCloud-synced; Android KeyStore AES-GCM) via `@aparajita/capacitor-secure-storage`. Browsers persist nothing, so a reload signs out. Native builds additionally need a device-reachable API base URL; see `docs/testing/ACCOUNT_SESSION_INTEGRATION.md`. Before future work, read `AGENTS.md`, the handoff, reporting policy, status file and applicable documentation.

For an Android debug build, use JDK 21 and the installed Android SDK, run `npm run build`, `npm run cap:sync`, then `android\gradlew.bat assembleDebug`. The repository does not commit machine-local SDK paths. A successful APK build is not device/API integration evidence.
