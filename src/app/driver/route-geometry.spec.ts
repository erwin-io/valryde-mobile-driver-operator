import { isValidRouteGeometry, routeBounds } from './route-geometry';

describe('route geometry', () => {
  it('requires a finite in-range LineString with at least two coordinates', () => {
    expect(isValidRouteGeometry([])).toBe(false);
    expect(isValidRouteGeometry([[123, 10]])).toBe(false);
    expect(isValidRouteGeometry([[181, 10], [123, 10]])).toBe(false);
    expect(isValidRouteGeometry([[123, 91], [123, 10]])).toBe(false);
    expect(isValidRouteGeometry([[Number.NaN, 10], [123, 10]])).toBe(false);
    expect(isValidRouteGeometry([[123, 10], [124, 11]])).toBe(true);
  });

  it('calculates bounds across every route coordinate', () => {
    expect(routeBounds([[124, 11], [122, 12], [123, 9]])).toEqual([[122, 9], [124, 12]]);
  });
});
