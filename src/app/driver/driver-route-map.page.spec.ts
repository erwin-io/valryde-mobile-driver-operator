import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { of, Subject, throwError } from 'rxjs';

import { FleetApiService } from '../core/fleet-api.service';
import type { EffectiveRouteDirection, Jeepney, TransitRoute } from '../core/fleet.models';
import { DriverRouteMapPage } from './driver-route-map.page';
import { STATIC_ROUTE_MAP_FACTORY } from './static-route-map.component';

const jeepney = (over: Partial<Jeepney> = {}): Jeepney => ({
  id: 'j-1',
  operatorId: 'op-1',
  plateNo: 'ABC 123',
  colorHex: '#1565C0',
  description: null,
  status: 'ACTIVE',
  approvedAt: '2026-10-22T00:00:00Z',
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  ...over,
});

const effective = (over: Partial<EffectiveRouteDirection> = {}): EffectiveRouteDirection => ({
  source: 'DIRECT',
  assignmentId: 'assignment-1',
  groupId: null,
  activeFrom: '2026-10-22T00:00:00Z',
  direction: {
    id: 'direction-1',
    routeId: 'route-1',
    directionLabel: 'Outbound',
    originName: 'Carbon',
    destinationName: 'Lahug',
    geometry: { type: 'LineString', coordinates: [[123.89, 10.29], [123.91, 10.33]] },
    corridorM: 100,
    status: 'ACTIVE',
    createdAt: '2026-10-22T00:00:00Z',
    updatedAt: '2026-10-22T00:00:00Z',
  },
  ...over,
});

const transitRoute = (assignment = effective()): TransitRoute => ({
  id: 'route-1',
  routeCode: 'T-01',
  publicName: 'Carbon – Lahug',
  description: null,
  routeColorHex: '#E53935',
  status: 'ACTIVE',
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  directions: [assignment.direction],
});

const rejected = (status: number, code: string, message = code) =>
  throwError(() => new HttpErrorResponse({ status, error: { error: { code, message } } }));

describe('DriverRouteMapPage (D03/D04)', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let api: { currentAssignment: Mock; listJeepneys: Mock; effectiveRoute: Mock; getRoute: Mock };
  let map: Record<string, Mock>;

  const render = async (query: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      imports: [DriverRouteMapPage],
      providers: [
        provideRouter([]),
        { provide: FleetApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        { provide: STATIC_ROUTE_MAP_FACTORY, useValue: vi.fn(async () => map as unknown as MapLibreMap) },
      ],
    });
    const fixture = TestBed.createComponent(DriverRouteMapPage);
    fixture.detectChanges();
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    };
    await settle();
    return { fixture, settle, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  beforeEach(() => {
    const assigned = effective();
    api = {
      currentAssignment: vi.fn(() => of({ jeepneyId: 'j-1' })),
      listJeepneys: vi.fn(() => of([jeepney()])),
      effectiveRoute: vi.fn(() => of(assigned)),
      getRoute: vi.fn(() => of(transitRoute(assigned))),
    };
    map = {
      loaded: vi.fn(() => true),
      once: vi.fn((_event: string, callback: () => void) => callback()),
      getSource: vi.fn(() => undefined),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setPaintProperty: vi.fn(),
      fitBounds: vi.fn(),
      resize: vi.fn(),
      remove: vi.fn(),
    };
  });

  it('selects only the server-confirmed assignment when multiple vehicles are visible', async () => {
    api.listJeepneys.mockReturnValue(of([jeepney(), jeepney({ id: 'j-2', plateNo: 'XYZ 789' })]));
    const { text } = await render();
    expect(text()).toContain('Current assignment confirmed');
    expect(text()).not.toContain('XYZ 789');
    expect(api.effectiveRoute).toHaveBeenCalledWith('j-1');
  });

  it('ignores a query-string vehicle that differs from the current assignment', async () => {
    api.listJeepneys.mockReturnValue(of([jeepney(), jeepney({ id: 'j-2', plateNo: 'XYZ 789' })]));
    await render({ jeepneyId: 'j-2' });
    expect(api.effectiveRoute).toHaveBeenCalledWith('j-1');
    expect(api.effectiveRoute).not.toHaveBeenCalledWith('j-2');
  });

  it('shows unassigned and inaccessible states without fabricating route data', async () => {
    api.currentAssignment.mockReturnValue(of(null));
    expect((await render()).text()).toContain('No assigned vehicle');
    expect(api.listJeepneys).not.toHaveBeenCalled();
    expect(api.effectiveRoute).not.toHaveBeenCalled();
  });

  it('does not resolve a route for an inactive vehicle', async () => {
    api.listJeepneys.mockReturnValue(of([jeepney({ status: 'INACTIVE' })]));
    expect((await render()).text()).toContain('Vehicle is not active');
    expect(api.effectiveRoute).not.toHaveBeenCalled();
  });

  it('shows a no-route state for the server null result', async () => {
    api.effectiveRoute.mockReturnValue(of(null));
    expect((await render()).text()).toContain('No route assigned');
    expect(api.getRoute).not.toHaveBeenCalled();
  });

  it('keeps server route conflicts distinct', async () => {
    api.effectiveRoute.mockReturnValue(rejected(409, 'ROUTE_ASSIGNMENT_CONFLICT'));
    expect((await render()).text()).toContain('more than one group with different routes');
  });

  it('rejects invalid canonical geometry instead of drawing it', async () => {
    api.effectiveRoute.mockReturnValue(of(effective({ direction: { ...effective().direction, geometry: { type: 'LineString', coordinates: [[181, 10], [123, 10]] } } })));
    expect((await render()).text()).toContain('published geometry is inactive or invalid');
    expect(api.getRoute).not.toHaveBeenCalled();
    expect(map['addSource']).not.toHaveBeenCalled();
  });

  it('renders official identity, endpoints, source, color and static geometry', async () => {
    const { fixture, text } = await render();
    expect(text()).toContain('T-01');
    expect(text()).toContain('Carbon – Lahug');
    expect(text()).toContain('Outbound');
    expect(text()).toContain('Carbon');
    expect(text()).toContain('Lahug');
    expect(text()).toContain('Direct vehicle route');
    expect(text()).toContain('does not use phone GPS');
    expect(map['addSource']).toHaveBeenCalledWith('official-route', expect.objectContaining({ type: 'geojson' }));
    expect(map['fitBounds']).toHaveBeenCalled();
    fixture.destroy();
    expect(map['remove']).toHaveBeenCalled();
  });

  it('labels a group-derived effective route from the server', async () => {
    const grouped = effective({ source: 'GROUP', groupId: 'group-1' });
    api.effectiveRoute.mockReturnValue(of(grouped));
    api.getRoute.mockReturnValue(of(transitRoute(grouped)));
    expect((await render()).text()).toContain('Fleet group route');
  });

  it('shows an API failure with retry without exposing stale route data', async () => {
    api.effectiveRoute.mockReturnValue(rejected(503, 'SERVICE_UNAVAILABLE', 'Route service unavailable'));
    const { text } = await render();
    expect(text()).toContain('VALRYDE is unavailable right now');
    expect(text()).not.toContain('Carbon – Lahug');
  });

  it('ignores a stale route response after the Driver chooses another authorized vehicle', async () => {
    const firstRoute = new Subject<EffectiveRouteDirection | null>();
    const first = jeepney();
    const second = jeepney({ id: 'j-2', plateNo: 'XYZ 789' });
    api.listJeepneys.mockReturnValue(of([first, second]));
    const { fixture, settle, text } = await render();
    api.effectiveRoute.mockImplementation((id: string) => (id === first.id ? firstRoute : of(effective())));
    const page = fixture.componentInstance as unknown as { loadVehicles(): Promise<void> };
    api.currentAssignment.mockReturnValueOnce(of({ jeepneyId: 'j-1' })).mockReturnValueOnce(of({ jeepneyId: 'j-2' }));
    const stale = page.loadVehicles();
    await new Promise(resolve => setTimeout(resolve));
    await page.loadVehicles();
    firstRoute.next(effective({ direction: { ...effective().direction, originName: 'Stale origin' } }));
    firstRoute.complete();
    await stale;
    await settle();
    expect(text()).toContain('XYZ 789');
    expect(text()).toContain('Carbon – Lahug');
    expect(text()).not.toContain('Stale origin');
  });

  it.each([403, 404])('clears the assigned vehicle after a %s route access rejection', async status => {
    api.effectiveRoute.mockReturnValue(rejected(status, status === 403 ? 'FORBIDDEN' : 'NOT_FOUND'));
    const { text } = await render();
    expect(text()).toContain('no longer available');
    expect(text()).not.toContain('ABC 123');
    expect(api.getRoute).not.toHaveBeenCalled();
  });

  it('makes a pending route response inert when the page is destroyed', async () => {
    const { fixture } = await render();
    api.getRoute.mockClear();
    const pendingRoute = new Subject<EffectiveRouteDirection | null>();
    api.effectiveRoute.mockReturnValue(pendingRoute);
    const page = fixture.componentInstance as unknown as {
      selectVehicle(vehicle: Jeepney): Promise<void>;
      state(): string;
    };
    const pending = page.selectVehicle(jeepney());
    expect(page.state()).toBe('loading');
    fixture.destroy();
    pendingRoute.next(effective());
    pendingRoute.complete();
    await pending;
    expect(page.state()).toBe('loading');
    expect(api.getRoute).not.toHaveBeenCalled();
  });
});
