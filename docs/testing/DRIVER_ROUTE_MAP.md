# Driver Authorized Route and Static Map Verification

**Checklist:** 40–41 · **Slice:** D6/D7 · **Branch:** `feat/40-41-driver-route-map-foundation`

## Contract boundary

The screen consumes only Agent A's existing Driver-scoped `GET /api/jeepneys`, `GET /api/jeepneys/{jeepneyId}/effective-route`, and public `GET /api/transit-routes/{routeId}` responses. The client does not calculate effective-route precedence or widen server scope.

G3 is not implemented. The UI therefore calls every listed vehicle **authorized** or **accessible**, requires an explicit selection when more than one is visible, and states that active Driver assignment is not confirmed. DIRECT/GROUP describes the route assignment source returned by the effective-route resolver; it is not evidence that the signed-in Driver is actively assigned to that vehicle.

The MapLibre view contains only the published LineString, official route color and endpoint markers. It deliberately has no phone GPS, tracker location, live groupmate data, compliance state, deviation alert, Traccar identifier, basemap-provider credential, or realtime subscription.

## Deterministic acceptance evidence

| Case | Expected behavior | Automated evidence |
|---|---|---|
| Multiple authorized vehicles | Requires an explicit vehicle choice and makes no active-assignment claim | `driver-route-map.page.spec.ts` |
| Requested vehicle outside server result | Never loads it; only a server-returned ID may be selected | page selection logic and requested-ID test |
| No authorized vehicle | Shows operator-association/assignment guidance; no route request | page spec |
| Inactive vehicle | Shows unavailable state; no effective-route request | page spec |
| Effective route `null` | Shows no-route state | page spec |
| `ROUTE_ASSIGNMENT_CONFLICT` | Shows operator-resolution state, separate from network errors | page spec |
| Inactive/invalid direction or geometry | Does not create a map source | page spec + `route-geometry.spec.ts` |
| Valid route | Shows route code/name, direction, origin, destination and DIRECT/GROUP source; draws official geometry/color and fits the camera | page spec |
| Recenter | Fits the camera to canonical geometry with fixed padding and no animation | map component behavior |
| Map disposal | Disconnects its observer and calls MapLibre `remove()` | page/component destruction assertion |
| API failure | Shows retryable unavailable state without stale route data | page spec |

## Verification results

- `npm run check`: passed; 13 files / 158 tests, lint clean, production build successful.
- Production initial bundle: 922.37 kB (existing 700 kB warning retained; below unchanged 1 MB error budget). MapLibre is lazy-loaded in a separate 1.05 MB chunk.
- `npm audit --omit=dev`: zero runtime vulnerabilities.
- `npx cap sync android`: passed; secure-storage and App plugins detected.
- `android\gradlew.bat assembleDebug` under JDK 21.0.6: passed; debug APK generated.
- Physical Android launch, device-reachable API, WebView WebGL, KeyStore restore and GPS hardware: not run; owner/device verification remains required.
