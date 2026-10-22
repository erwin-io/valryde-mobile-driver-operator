/** Local presentation model only. This is NOT an Agent B API/Pusher DTO. */
export type TrackingAvailability = 'unavailable' | 'ready' | 'stale' | 'offline' | 'denied';
export type Compliance = 'UNKNOWN' | 'ON_ROUTE' | 'OFF_ROUTE';

export interface TrackingVehicleView {
  id: string;
  plate: string;
  observedAt: string | null;
  availability: TrackingAvailability;
  compliance: Compliance;
  coordinate: readonly [number, number] | null;
}

export interface TrackingView {
  source: 'unavailable' | 'development-fixture';
  availability: TrackingAvailability;
  vehicles: readonly TrackingVehicleView[];
}

export const unavailableTracking: TrackingView = { source: 'unavailable', availability: 'unavailable', vehicles: [] };

/** Only explicitly current, source-supplied state can display a location or compliance. No thresholds here. */
export function presentTrackingVehicle(vehicle: TrackingVehicleView): TrackingVehicleView {
  if (vehicle.availability !== 'ready') return { ...vehicle, coordinate: null, compliance: 'UNKNOWN' };
  const point = vehicle.coordinate;
  if (!point || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) {
    return { ...vehicle, coordinate: null, compliance: 'UNKNOWN', availability: 'unavailable' };
  }
  return { ...vehicle };
}

export function presentTracking(view: TrackingView): TrackingView {
  // Until an approved adapter exists, operational screens can only be unavailable.
  if (view.source !== 'development-fixture') return unavailableTracking;
  if (view.availability === 'denied') return { ...view, vehicles: [] };
  return { ...view, vehicles: view.vehicles.map(vehicle => presentTrackingVehicle({
    ...vehicle, availability: view.availability === 'ready' ? vehicle.availability : view.availability,
  })) };
}
