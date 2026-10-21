# Role-Based Navigation Contract

**Checkpoint:** `UX_CONTRACT_READY`

## Shell hierarchy

```text
App shell
├─ Public/auth stack
│  ├─ Welcome
│  ├─ Sign in
│  ├─ Registration
│  ├─ Email verification
│  └─ Password recovery
├─ Role chooser (authorized multi-role accounts only)
├─ Driver tab shell
└─ Operator tab shell
```

Use one `ion-app` and Angular router. Each role shell owns an independent `ion-tabs` navigation context so a Driver back stack cannot expose an Operator page and vice versa.

## Driver tab routes

| Tab | Root route | Child routes | Badge/urgent state |
|---|---|---|---|
| Home | `/driver/home` | `/driver/jeepney`, `/driver/route` | Off-route, tracker unavailable or assignment issue indicator |
| Route Map | `/driver/map` | map detail sheets only | Persistent compliance/freshness status |
| Group | `/driver/group` | `/driver/group/:jeepneyId` | No numeric badge in MVP |
| Events | `/driver/events` | `/driver/events/:eventId` | Optional unread count only if approved contract exists |
| Account | `/account` | `/account/profile`, `/account/security` | Verification/security attention only |

Driver Home prioritizes assignment, tracker freshness and compliance. Route Map is glanceable with a prominent recenter control and minimal interaction. Nonessential forms are excluded from the driving view.

## Operator tab routes

| Tab | Root route | Child routes | Notes |
|---|---|---|---|
| Dashboard | `/operator/dashboard` | `/operator/compliance`, vehicle compliance detail | Exception-first summary |
| Fleet | `/operator/fleet` | jeepneys, drivers, groups, live map and nested details/forms | Driver/Group management stays nested |
| Transits | `/operator/transits` | transit detail/map/summary | Official geometry read-only |
| Requests | `/operator/requests` | vehicle applications, GPS setup, route-change requests | No Admin review/mapping actions |
| Account | `/account` | `/account/profile`, `/account/security` | Shared pages under role shell |

## Guard and resolver order

1. Restore/refresh session.
2. Resolve current user and server-authorized roles.
3. Match public, Driver, Operator or multi-role route.
4. Apply client role guard and resource precondition checks.
5. Fetch server-scoped resource; treat `403`/`404` according to approved error semantics.
6. Render the page only after protected cached data from the prior context is cleared.

Client guards are navigation safety, not authorization. Backend RBAC remains authoritative.

## Redirects

| Condition | Destination |
|---|---|
| No valid session | `/auth/sign-in` with safe return intent |
| Verified single Driver role | `/driver/home` |
| Verified single Operator role | `/operator/dashboard` |
| Multiple authorized roles, no active context | `/role` |
| Driver requests Operator route | `/driver/home` + access-unavailable notice |
| Operator requests Driver route | `/operator/dashboard` + access-unavailable notice |
| Resource removed/no longer in scope | Owning tab root with stale cache removed |
| Unknown route | Current role root, otherwise `/welcome` |

Do not put tokens, private IDs or sensitive state in return URLs/deep-link query strings.

## Back behavior

- Android hardware back follows the active tab stack; at a tab root, a second deliberate back may exit according to platform convention.
- Modal/sheet back dismisses the overlay before navigating.
- Unsaved create/edit forms prompt before leaving.
- Switching tabs restores each tab's safe navigation state but must refetch data according to freshness rules.
- Role switching clears all tab stacks for the previous role.

## Deep links

- Accept only declared routes and validate session, role and resource scope before rendering.
- OAuth/email verification links use the approved Agent A flow and a secure platform link strategy.
- A deep link never changes active role silently and never carries bearer/session secrets.
- If a resource is unavailable, navigate to a safe role root rather than leaving protected content visible.

## Offline and resume behavior

- Offline protected pages may show an approved cached snapshot only with an explicit offline/stale label.
- Mutations are disabled offline; no speculative queue for assignments/approvals in MVP.
- On app resume, reconcile session, active role snapshot and realtime scope before declaring data current.

## Driving-safety rules

- Driver map controls are limited to recenter/follow, safe group visibility/detail, and audio mute.
- Primary controls meet at least 48 px touch target on the map.
- Alerts do not cover essential map state indefinitely.
- Route deviation never launches turn-by-turn directions or automatic rerouting.
