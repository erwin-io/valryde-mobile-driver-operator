import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  inject,
  input,
  type AfterViewInit,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { addIcons } from 'ionicons';
import { locateOutline } from 'ionicons/icons';

import { routeBounds, type RouteCoordinate } from './route-geometry';

export type StaticRouteMapFactory = (container: HTMLElement) => Promise<MapLibreMap>;

const blankStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f4' } }],
};

export const STATIC_ROUTE_MAP_FACTORY = new InjectionToken<StaticRouteMapFactory>('STATIC_ROUTE_MAP_FACTORY', {
  providedIn: 'root',
  factory: () => async (container) => {
    const maplibre = await import('maplibre-gl');
    return new maplibre.Map({
      container,
      style: blankStyle,
      center: [123.8854, 10.3157],
      zoom: 11,
      attributionControl: false,
      interactive: false,
    });
  },
});

@Component({
  selector: 'app-static-route-map',
  standalone: true,
  imports: [IonButton, IonIcon],
  template: `
    <div class="map-frame">
      <div #mapContainer class="map" role="img" [attr.aria-label]="'Official route map from ' + originName() + ' to ' + destinationName()"></div>
      <ion-button class="recenter" size="small" fill="solid" aria-label="Recenter route map" (click)="recenter()">
        <ion-icon name="locate-outline" slot="start" aria-hidden="true" /> Recenter
      </ion-button>
    </div>
    @if (failed()) {
      <p class="map-error" role="status">The route map could not be displayed. The official route details remain available above.</p>
    }
  `,
  styles: `
    .map-frame { background: #eef2f4; border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-md); min-height: 18rem; overflow: hidden; position: relative; }
    .map { height: 18rem; overflow: hidden; position: relative; width: 100%; }
    :host ::ng-deep .maplibregl-canvas-container { height: 100%; }
    :host ::ng-deep .maplibregl-canvas { left: 0; position: absolute; top: 0; }
    .recenter { position: absolute; right: var(--vr-space-2); top: var(--vr-space-2); z-index: 2; }
    .map-error { color: var(--vr-color-danger-text); font-size: 0.875rem; margin: var(--vr-space-2) 0 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaticRouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly factory = inject(STATIC_ROUTE_MAP_FACTORY);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('mapContainer');
  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  readonly coordinates = input.required<readonly RouteCoordinate[]>();
  readonly routeColor = input.required<string>();
  readonly originName = input.required<string>();
  readonly destinationName = input.required<string>();
  protected readonly failed = signal(false);

  constructor() {
    addIcons({ locateOutline });
  }

  ngAfterViewInit(): void {
    void this.initialize();
  }

  ngOnChanges(): void {
    if (this.map?.loaded()) this.renderRoute();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  protected recenter(): void {
    if (this.map?.loaded()) this.fitRoute();
  }

  private async initialize(): Promise<void> {
    try {
      const map = await this.factory(this.container().nativeElement);
      if (this.destroyed) {
        map.remove();
        return;
      }
      this.map = map;
      map.once('load', () => {
        if (!this.destroyed) this.renderRoute();
      });
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => map.resize());
        this.resizeObserver.observe(this.container().nativeElement);
      }
    } catch {
      this.failed.set(true);
    }
  }

  private renderRoute(): void {
    if (!this.map) return;
    const coordinates = this.coordinates();
    const mutableCoordinates: [number, number][] = coordinates.map(([longitude, latitude]) => [longitude, latitude]);
    const data: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { endpoint: null }, geometry: { type: 'LineString', coordinates: mutableCoordinates } },
        { type: 'Feature', properties: { endpoint: 'origin' }, geometry: { type: 'Point', coordinates: [...coordinates[0]] } },
        { type: 'Feature', properties: { endpoint: 'destination' }, geometry: { type: 'Point', coordinates: [...coordinates.at(-1)!] } },
      ],
    };
    const existing = this.map.getSource('official-route') as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
      this.map.setPaintProperty('official-route-line', 'line-color', this.routeColor());
    } else {
      this.map.addSource('official-route', { type: 'geojson', data });
      this.map.addLayer({
        id: 'official-route-line',
        type: 'line',
        source: 'official-route',
        filter: ['==', '$type', 'LineString'],
        paint: { 'line-color': this.routeColor(), 'line-width': 6, 'line-opacity': 0.9 },
      });
      this.map.addLayer({
        id: 'official-route-endpoints',
        type: 'circle',
        source: 'official-route',
        filter: ['==', '$type', 'Point'],
        paint: { 'circle-color': '#ffffff', 'circle-radius': 7, 'circle-stroke-color': this.routeColor(), 'circle-stroke-width': 4 },
      });
    }
    this.fitRoute();
  }

  private fitRoute(): void {
    this.map?.fitBounds(routeBounds(this.coordinates()), { animate: false, maxZoom: 16, padding: 40 });
  }
}
