# GPS Application Workflow

## Operator path

1. Register and verify the Operator account.
2. Create/view an owned jeepney record.
3. Submit an individual vehicle application; account creation alone does not activate a vehicle.
4. After the approved workflow permits it, submit a GPS setup request with the required jeepney, plate, approved route context, contact, and preferred installation date.
5. Track request state: `PENDING`, `APPROVED`, `SCHEDULED`, `INSTALLED`, or `REJECTED`, plus approved mapping/verification state.
6. Show clear next steps without exposing administrative controls.

## Admin/service-provider boundary

Operator UI does not approve/reject applications, transition installation state arbitrarily, register/map Traccar devices, or verify installation. Those are Admin/service-provider operations enforced by backend RBAC.

## Activation invariant

A vehicle is not operational merely because an Operator or jeepney record exists. Individual application approval, GPS installation/mapping/verification, approved route assignment, and backend eligibility must all be satisfied.

## Failure and stale-state handling

Render server validation and state-transition errors accurately. After mutation, reconcile from the server. Offline cached status must carry its last-updated time and must not imply installation or activation has advanced.
