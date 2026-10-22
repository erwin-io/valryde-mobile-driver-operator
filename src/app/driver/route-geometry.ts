export type RouteCoordinate = readonly [longitude: number, latitude: number];

export function isValidRouteGeometry(coordinates: readonly RouteCoordinate[]): boolean {
  return (
    coordinates.length >= 2 &&
    coordinates.every(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90,
    )
  );
}

export function routeBounds(coordinates: readonly RouteCoordinate[]): [[number, number], [number, number]] {
  if (!isValidRouteGeometry(coordinates)) throw new Error('A valid route LineString is required');
  let west = coordinates[0][0];
  let east = west;
  let south = coordinates[0][1];
  let north = south;
  for (const [longitude, latitude] of coordinates.slice(1)) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  return [
    [west, south],
    [east, north],
  ];
}
