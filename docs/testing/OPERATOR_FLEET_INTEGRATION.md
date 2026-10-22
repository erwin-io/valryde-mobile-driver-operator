# Operator Fleet (D2/D3/D5) — Integration Evidence

**Date:** 2026-10-22 · **Checklist:** 48, 50 (partial); 39, 47 (shell data, partial) · **Branch:** `feat/48-50-operator-fleet` (stacked on `feat/38-46-account-security`)

**Environment:** the same isolated stack as D1:
- Agent A dev API on `:3001`, run from the `valryde-api` checkout at `711f4c4`. Fleet and workflow logic is identical to `origin/main` `827738c`.
- Isolated Mailpit, and the app on `:8100`.
- The browser pane was hidden, so flows were driven through the app's forms and router.

Contracts are in [`AGENT_D_CONTRACT_INVENTORY.md`](../integration/AGENT_D_CONTRACT_INVENTORY.md).

## Test accounts (created through `POST /auth/register`, verified via Mailpit links)

- **OPERATOR A:** `agent-d-it-sec-new-1022@example.test` (from D1).
- **OPERATOR B:** `agent-d-it-op2-1022@example.test`.
- **DRIVER:** `agent-d-it-drv-1022@example.test`.

**Dev records created:**
- jeepney `AGD 1022`
- application on that jeepney (PENDING)
- group `AGD Group 1022` (now INACTIVE)

None are deleted: shared dev records need owner-approved cleanup.

## Real API results

| Flow | Observed |
|---|---|
| Fleet hub / dashboard before creating | counts 0 / 0 |
| Create jeepney through the form (`AGD 1022`, `#2e7d32`, description) | `POST /jeepneys` 201 → detail shows server `Draft`, `#2E7D32` |
| Effective route on the new jeepney | 200 `null` → "No route assigned." |
| Edit (plate shown read-only) | `PATCH /jeepneys/:id` 200, color `#C62828` |
| Submit for approval with notes | `POST /vehicle-applications` 201; re-read shows jeepney **Pending approval** and application **Pending** (server-set) |
| Second application | 409 `CONFLICT` |
| Operator sends `status: ACTIVE` (escalation attempt, outside the UI) | 403 `FORBIDDEN` |
| Create group (name trimmed) | `POST /fleet-groups` 201 |
| Edit group to Inactive | `PATCH /fleet-groups/:id` 200; re-read `INACTIVE` |
| Dashboard / Fleet hub / list after | Jeepneys 1 (0 active), Awaiting approval 1, Groups 1; list shows `AGD 1022 · Pending approval` |
| **Cross-operator (Operator B)** | A's jeepney, group and application are absent from B's lists. PATCH jeepney, PATCH group, apply for A's jeepney and read A's effective route all return **403 FORBIDDEN**. Create with a spoofed `operatorId` → **403** |
| **Driver RBAC** | 0 jeepneys visible. Create group, patch A's group and patch A's jeepney → **403 FORBIDDEN** |
| No token | 401 `AUTH_REQUIRED` |

## Gated (absent or disabled, with the reason shown in the UI)

| Control | Reason |
|---|---|
| Driver assignment | G1 directory/assignment client work is prepared in D8 against approved PR #12; live verification still waits for that API implementation to merge and deploy. |
| Group members, adding drivers or jeepneys | **G1**/**G2**: no membership read or remove, so it can't be shown or undone |
| Drivers directory | **G1** |
| Live fleet map; online, moving and off-route counts | **Agent B** |
| Driver "assigned jeepney" | **G3**: shown only as "jeepneys you can access" |

## Mocked tests

`fleet-api.service.spec.ts` and `fleet.pages.spec.ts` cover:
- payloads: no `status`, no `operatorId`, no empty notes
- list, filter, empty and error states
- create/edit validation and server rejections (409, 403)
- cross-operator IDs absent from the scoped list never shown, and no route query for them
- application states, including resubmission after a rejection
- the status shown after submit comes only from the server's re-read
- effective-route null, conflict and direct
- groups CRUD, gated membership, dashboard counts, preview mode with no API calls
- Driver home states
