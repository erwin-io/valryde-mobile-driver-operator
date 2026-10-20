# Vehicle/Driver Association Workflows

## Driver association

1. Driver creates and verifies an eligible account.
2. Operator initiates or accepts the approved association/invitation workflow.
3. Backend verifies identity, role, operator ownership, and association state.
4. Operator may place the associated Driver into an owned group and assign an owned eligible jeepney.
5. Driver sees only the effective assignment returned by the backend.

The client must not infer association from a typed operator ID or locally mutate ownership.

## Jeepney assignment

1. Operator selects an owned eligible jeepney and associated eligible Driver.
2. Client submits the approved assignment command.
3. Backend enforces uniqueness, state, ownership, and group visibility.
4. Client refreshes the assigned vehicle/effective route rather than assuming optimistic success.
5. Reassignment removes stale Driver-scoped vehicle, route, location, and group cache entries.

## Required UI states

Loading, no association, invitation/association pending where supported, no eligible jeepney, assignment conflict, forbidden ownership, validation error, success, retry, and stale/offline state.
