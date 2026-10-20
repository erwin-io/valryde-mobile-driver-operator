# Operator/Driver Role Matrix

Backend RBAC and resource ownership are authoritative. This matrix guides client visibility and navigation; it does not grant access.

| Capability | DRIVER | OPERATOR | Authority / constraint |
|---|---|---|---|
| Manage own profile/session | Yes | Yes | Backend auth/profile contract |
| View assigned jeepney | Yes | Own-fleet vehicles | Server-scoped response |
| View assigned route/direction | Assigned vehicle only | Own approved assignments | Effective-route precedence is server-owned |
| View tracker-derived own location | Assigned vehicle only | Own fleet | Phone GPS is not authoritative vehicle telemetry |
| View same-group vehicles | Permitted group only | Own groups/fleet | Cross-group/operator access must be denied server-side |
| View compliance state | Assigned vehicle/group scope | Own fleet | Consume `UNKNOWN`, `ON_ROUTE`, `OFF_ROUTE`; do not recompute |
| Manage drivers and assignments | No | Own drivers/vehicles only | Verified association and ownership required |
| Manage fleet groups | No | Own groups only | Server validates membership/ownership |
| Assign transit direction | No | Approved own vehicles/groups only | Approved directions only; Admin owns geometry |
| Submit route add/change request | No | Yes | Request only; cannot mutate canonical route |
| Submit vehicle/GPS application | No administrative approval | Own vehicles | Individual approval/install/mapping required |
| Install/map/verify GPS device | No | No | Admin/service-provider operation |
| Access platform-wide data | No | No | Admin only |

## Multi-role context

If a user has both roles, expose an explicit server-authorized role context. Switching context changes navigation and available actions, but never elevates a token/session or bypasses endpoint authorization.
