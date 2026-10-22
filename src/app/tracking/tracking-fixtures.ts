import type { TrackingAvailability, TrackingView } from './tracking-view';

/** Synthetic UI fixtures only. Imported exclusively by the development preview route. */
export function trackingFixture(availability: TrackingAvailability, empty = false): TrackingView {
  return {
    source: 'development-fixture', availability,
    vehicles: empty ? [] : [{
      id: 'fixture-vehicle', plate: 'DEMO ONLY', observedAt: '2026-10-23T00:00:00Z', availability,
      compliance: 'OFF_ROUTE', coordinate: [123.9, 10.3],
    }],
  };
}
