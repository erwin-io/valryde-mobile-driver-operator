# Valryde Operator Screen Inventory

**Checkpoint:** `UX_CONTRACT_READY`
**Scope:** Agent D checklist IDs 38–55
**Roles:** `DRIVER`, `OPERATOR`

This inventory defines the complete MVP screen set. A screen may be implemented as an Ionic page, modal, or sheet as indicated; the distinction does not change backend authorization.

## Shared authentication and account screens

| ID | Route / presentation | Screen | Roles | Primary purpose | Contract state |
|---|---|---|---|---|---|
| S01 | `/welcome` | Welcome / role-aware entry | Public | Explain Valryde Operator and start sign-in or registration | Ready for UX |
| S02 | `/auth/sign-in` | Sign in | Driver, Operator | Email/password sign-in and Google entry where enabled | Agent A endpoint observed; DTO review |
| S03 | `/auth/register` | Choose account type | Public | Choose Driver or Operator registration; no combined implicit role | Agent A endpoint observed; role rules review |
| S04 | `/auth/register/driver` | Driver registration | Public | Collect approved Driver account fields and consent | Agent A DTO review |
| S05 | `/auth/register/operator` | Operator registration | Public | Collect approved Operator account fields and consent | Agent A DTO review |
| S06 | `/auth/verify-email` | Verify email | Public/session pending | Submit verification code/link state; resend | Endpoint observed |
| S07 | `/auth/forgot-password` | Forgot password | Public | Request account recovery | Endpoint observed |
| S08 | `/auth/reset-password` | Reset password | Public | Set a new password from approved challenge | Endpoint observed |
| S09 | `/role` | Role context chooser | Multi-role only | Enter an authorized Driver or Operator context | UX ready; session semantics review |
| S10 | `/account` | Account | Driver, Operator | Profile summary, role, warning preference, security, sign out | Profile endpoints observed |
| S11 | `/account/profile` | Edit profile | Driver, Operator | Edit permitted profile fields | DTO review |
| S12 | `/account/security` | Account security | Driver, Operator | Change password/email and session actions | Endpoints observed |
| S13 | modal | Sign-out confirmation | Driver, Operator | Confirm sign out and scoped cache clearance | UX ready |

## Driver screens

Primary tabs: Home · Route Map · Group · Events · Account.

| ID | Route / presentation | Screen | Checklist | Primary content/actions | Contract state |
|---|---|---|---:|---|---|
| D01 | `/driver/home` | Driver Home | 39, 40, 42, 43 | Assigned jeepney, effective route, tracker freshness, compliance, urgent next step | Partial; latest-state blocked |
| D02 | `/driver/jeepney` | My Jeepney | 39 | Plate, physical color, approval, tracker state, assigned route summary | Fleet DTO review |
| D03 | `/driver/route` | Assigned Route Detail | 40 | Route code/name, direction, origin/destination, assignment state | Effective-route endpoint observed |
| D04 | `/driver/map` | Route Guidance Map | 41–44 | Official route line, tracker position, heading/follow, recenter, groupmates, warning | Tracking contract blocked |
| D05 | bottom sheet | Own Vehicle Map Detail | 42, 43 | Plate, tracker/location freshness, motion and compliance | Tracking DTO blocked |
| D06 | banner + sheet | Off-route Warning | 43 | Persistent visible warning, last update, mute/unmute optional audio | Compliance contract blocked |
| D07 | `/driver/group` | Group Map/List | 44, 45 | Toggle/list permitted same-group vehicles and their safe state | Scoped tracking blocked |
| D08 | `/driver/group/:jeepneyId` | Groupmate Detail | 45 | Permitted vehicle/driver name, status, last seen, basic details | Groupmate DTO blocked |
| D09 | `/driver/events` | Driver Events | 43 | Scoped deviation/re-entry and relevant operational events | Events/history blocked |
| D10 | `/driver/events/:eventId` | Driver Event Detail | 43 | Event time, vehicle, route, status transition, safe context | Events/history blocked |
| D11 | empty state | No Assignment | 39, 40 | Explain no assigned jeepney/route and operator contact next step | UX ready |
| D12 | blocking state | Tracker/Route Unavailable | 41–43 | Distinguish unknown, stale, unmapped, unassigned, offline, API failure | Tracking error taxonomy blocked |

## Operator screens

Primary tabs: Dashboard · Fleet · Transits · Requests · Account. Drivers and Groups are nested under Fleet.

| ID | Route / presentation | Screen | Checklist | Primary content/actions | Contract state |
|---|---|---|---:|---|---|
| O01 | `/operator/dashboard` | Operator Dashboard | 47 | Own-fleet counts: assigned/online/offline/moving/stopped/deviating plus exceptions | Aggregate endpoint blocked |
| O02 | `/operator/fleet` | Fleet Hub | 48–50 | Entry rows for Jeepneys, Drivers, Groups and live tracking | Existing list contracts partial |
| O03 | `/operator/fleet/jeepneys` | My Jeepneys | 48 | Owned vehicles, application/approval/tracker/assignment summary, search/filter | Jeepney list observed; DTO review |
| O04 | `/operator/fleet/jeepneys/new` | Add Jeepney | 48 | Permitted jeepney basics only | Create endpoint observed |
| O05 | `/operator/fleet/jeepneys/:id` | Jeepney Detail | 48 | Identity, physical color, approval, application, GPS, driver/group/route summaries | Multiple contracts; orchestration review |
| O06 | `/operator/fleet/jeepneys/:id/edit` | Edit Jeepney | 48 | Edit permitted owned vehicle basics | Update endpoint observed |
| O07 | `/operator/fleet/jeepneys/:id/application` | Vehicle Application | 48 | Submit/view individual vehicle application and status | Endpoints observed |
| O08 | `/operator/fleet/drivers` | Drivers | 49 | Associated drivers, association status and assignment summary | List/association contract incomplete |
| O09 | `/operator/fleet/drivers/associate` | Associate Driver | 49 | Approved verified email invitation/association flow | Workflow/DTO review |
| O10 | `/operator/fleet/drivers/:id` | Driver Detail | 49 | Permitted profile, groups, assigned jeepney | Scoped detail contract review |
| O11 | modal/sheet | Assign Driver to Jeepney | 49 | Select eligible owned jeepney, review conflict, submit, reconcile | Assignment endpoint observed |
| O12 | `/operator/fleet/groups` | Fleet Groups | 50 | Owned groups and member/vehicle counts | Group list observed |
| O13 | `/operator/fleet/groups/new` | Create Group | 50 | Create owned group | Create endpoint observed |
| O14 | `/operator/fleet/groups/:id` | Group Detail | 50, 51 | Group information, drivers, vehicles, tracking entry | Membership contracts observed |
| O15 | `/operator/fleet/groups/:id/edit` | Edit Group | 50 | Edit permitted group information | Update endpoint observed |
| O16 | modal/sheet | Manage Group Members | 50 | Add eligible associated drivers and owned jeepneys | Membership endpoints observed |
| O17 | `/operator/fleet/live` | Fleet Live Map | 51 | All permitted own-fleet/group vehicle positions with filters | Scoped tracking blocked |
| O18 | `/operator/transits` | Transits | 52, 54 | Approved routes used by fleet plus operational summary | Routes observed; summary blocked |
| O19 | `/operator/transits/:routeId` | Transit Detail | 52, 54 | Official read-only route/directions and own assignment summary | Route detail observed |
| O20 | modal/sheet | Assign Transit Direction | 52 | Approved direction + eligible vehicle/group; reconcile effective route | Assignment endpoint observed |
| O21 | `/operator/transits/:routeId/map` | Transit Route Map | 52, 54 | Read-only official geometry and scoped assigned vehicles | Geometry observed; tracking blocked |
| O22 | `/operator/transits/:routeId/summary` | Transit Summary | 54 | Assigned/online/moving/stopped/offline/deviating counts | Aggregate endpoint blocked |
| O23 | `/operator/compliance` | Compliance Overview | 53 | Own-fleet ON_ROUTE/OFF_ROUTE/UNKNOWN groups and active deviations | Compliance aggregate blocked |
| O24 | `/operator/compliance/:jeepneyId` | Vehicle Compliance Detail | 53 | Current status, route, freshness, active deviation context | Compliance/history blocked |
| O25 | `/operator/requests` | Requests Hub | 48, 52, 55 | Vehicle applications, GPS setup and route-change requests | Partial |
| O26 | `/operator/requests/gps` | GPS Setup Requests | 55 | Owned requests with state, mapping/verification-safe status | List observed; DTO review |
| O27 | `/operator/requests/gps/new` | New GPS Setup Request | 55 | Jeepney, plate, approved route context, contact, preferred date | Submit observed; DTO review |
| O28 | `/operator/requests/gps/:id` | GPS Request Detail | 55 | Timeline: PENDING/APPROVED/SCHEDULED/INSTALLED/REJECTED plus safe mapping status | Detail shape review |
| O29 | `/operator/requests/route-change` | Route Change Requests | 52 | Own submitted route add/change requests | Endpoint absent |
| O30 | `/operator/requests/route-change/new` | New Route Change Request | 52 | Describe requested addition/change without editing official geometry | Endpoint absent |

## Global state surfaces

These are reusable states, not separate business screens.

| ID | Surface | Required behavior |
|---|---|---|
| G01 | Initial app/session loader | Resolve session and roles without flashing unauthorized tabs |
| G02 | Offline banner | Show offline status and last successful sync; never imply current tracking |
| G03 | Reconnecting indicator | Non-blocking realtime reconnect with REST reconciliation status |
| G04 | Access denied | Explain unavailable access, clear scoped data, route to safe landing |
| G05 | Expired session | Preserve no sensitive content, offer sign-in |
| G06 | Generic API error | Plain-language error, correlation/reference if approved, retry |
| G07 | Empty list | Explain why empty and expose only authorized next action |
| G08 | Skeleton/loading | Preserve layout, announce progress, prevent duplicate submission |
| G09 | Unsaved changes confirmation | Guard create/edit forms from accidental loss |
| G10 | Stale data marker | Show age/last update and prevent stale state from appearing live |

## Scope exclusions

There are no MVP screens for dispatch, ride requests, bookings, fare collection, wallets, revenue reports, driver scores/ratings, passenger counts, formal stops, chat, traffic-aware routing, automatic rerouting, or public tracking links.
