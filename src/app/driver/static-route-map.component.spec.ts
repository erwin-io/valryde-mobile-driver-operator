import { TestBed } from '@angular/core/testing';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { STATIC_ROUTE_MAP_FACTORY, StaticRouteMapComponent, type StaticRouteMapFactory } from './static-route-map.component';

describe('StaticRouteMapComponent', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let map: Record<string, Mock>;
  let source: { setData: Mock };
  let resizeCallback: (() => void) | undefined;
  let disconnect: Mock;
  let observe: Mock;

  const render = async (factory: StaticRouteMapFactory = async () => map as unknown as MapLibreMap) => {
    TestBed.configureTestingModule({
      imports: [StaticRouteMapComponent],
      providers: [{ provide: STATIC_ROUTE_MAP_FACTORY, useValue: factory }],
    });
    const fixture = TestBed.createComponent(StaticRouteMapComponent);
    fixture.componentRef.setInput('coordinates', [[123.89, 10.29], [123.91, 10.33]]);
    fixture.componentRef.setInput('routeColor', '#E53935');
    fixture.componentRef.setInput('originName', 'Carbon');
    fixture.componentRef.setInput('destinationName', 'Lahug');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    source = { setData: vi.fn() };
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
    disconnect = vi.fn();
    observe = vi.fn();
    class FakeResizeObserver {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('draws official geometry, fits/recenters, resizes and cleans up', async () => {
    const fixture = await render();
    expect(map['addSource']).toHaveBeenCalledWith('official-route', expect.objectContaining({ type: 'geojson' }));
    expect(map['addLayer']).toHaveBeenCalledTimes(2);
    expect(map['fitBounds']).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalled();

    (fixture.componentInstance as unknown as { recenter(): void }).recenter();
    expect(map['fitBounds']).toHaveBeenCalledTimes(2);
    resizeCallback?.();
    expect(map['resize']).toHaveBeenCalledTimes(1);

    map['getSource'].mockReturnValue(source as unknown as GeoJSONSource);
    fixture.componentRef.setInput('coordinates', [[123.88, 10.28], [123.92, 10.34]]);
    fixture.componentRef.setInput('routeColor', '#1565C0');
    fixture.detectChanges();
    expect(source.setData).toHaveBeenCalled();
    expect(map['setPaintProperty']).toHaveBeenCalledWith('official-route-line', 'line-color', '#1565C0');

    fixture.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(map['remove']).toHaveBeenCalledTimes(1);
  });

  it('removes a map whose asynchronous factory resolves after destruction', async () => {
    let resolveFactory!: (value: MapLibreMap) => void;
    const factory = vi.fn(() => new Promise<MapLibreMap>((resolve) => (resolveFactory = resolve)));
    TestBed.configureTestingModule({
      imports: [StaticRouteMapComponent],
      providers: [{ provide: STATIC_ROUTE_MAP_FACTORY, useValue: factory }],
    });
    const fixture = TestBed.createComponent(StaticRouteMapComponent);
    fixture.componentRef.setInput('coordinates', [[123.89, 10.29], [123.91, 10.33]]);
    fixture.componentRef.setInput('routeColor', '#E53935');
    fixture.componentRef.setInput('originName', 'Carbon');
    fixture.componentRef.setInput('destinationName', 'Lahug');
    fixture.detectChanges();
    fixture.destroy();
    resolveFactory(map as unknown as MapLibreMap);
    await new Promise((resolve) => setTimeout(resolve));
    expect(map['remove']).toHaveBeenCalledTimes(1);
    expect(map['addSource']).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });

  it('keeps route details usable when MapLibre initialization fails', async () => {
    const fixture = await render(async () => Promise.reject(new Error('WebGL unavailable')));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('official route details remain available');
    expect(map['addSource']).not.toHaveBeenCalled();
  });
});
