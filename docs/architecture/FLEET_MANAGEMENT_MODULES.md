# Fleet-Management Module Baseline

## Driver modules

- Home: assignment, tracker freshness, compliance, and urgent operational state.
- My Jeepney: assigned vehicle identity and approved tracker status.
- Route Map: approved route line, tracker position, heading/follow/recenter, and deviation state.
- Group: authorized same-group vehicles and details.
- Events: scoped operational/compliance events when an approved contract exists.
- Account: profile, security, session, and preferences.

## Operator modules

- Dashboard: own-fleet operational counts only.
- Fleet: vehicles/applications, driver management, assignment, groups, and details.
- Transits: approved route details, own assignments, compliance overview, and transit summaries.
- Requests: vehicle applications, GPS setup/status, and route add/change requests.
- Account: profile, security, session, and preferences.

## Domain boundaries

- Vehicle approval and GPS installation/mapping precede operational activation.
- Driver association must be explicit and verified; a client-supplied operator ID is insufficient.
- Direct vehicle route assignment takes precedence over one inherited active group assignment; conflict resolution belongs to the backend.
- Canonical route geometry/corridor values are read-only in this app.
- Aggregates must be returned or validated by the backend and scoped to the authorized operator.

## Explicit exclusions

Dispatch, bookings, passenger matching, fares, payments, revenue reports, driver scoring, maintenance optimization, and passenger counting are not approved MVP modules.
