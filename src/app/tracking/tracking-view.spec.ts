import { TestBed } from '@angular/core/testing';
import { presentTracking, presentTrackingVehicle, unavailableTracking, type TrackingVehicleView } from './tracking-view';
import { trackingFixture } from './tracking-fixtures';
import { TrackingPanelComponent } from './tracking-panel.component';

const observation: TrackingVehicleView = {
  id: 'fixture', plate: 'DEMO ONLY', observedAt: '2026-10-23T00:00:00Z',
  coordinate: [123.9, 10.3], availability: 'ready', compliance: 'OFF_ROUTE',
};

describe('Tracking presentation adapter (no public wire contract)', () => {
  it.each(['stale', 'offline', 'unavailable', 'denied'] as const)('hides coordinates and authoritative-looking compliance when %s', availability => {
    expect(presentTrackingVehicle({ ...observation, availability })).toMatchObject({ coordinate: null, compliance: 'UNKNOWN' });
  });
  it.each([[181, 10], [123, 91], [NaN, 10]] as const)('rejects invalid fixture coordinates %s', (longitude, latitude) => {
    expect(presentTrackingVehicle({ ...observation, coordinate: [longitude, latitude] })).toMatchObject({ coordinate: null, compliance: 'UNKNOWN', availability: 'unavailable' });
  });
  it('treats a missing current coordinate as unavailable and UNKNOWN', () => {
    expect(presentTrackingVehicle({ ...observation, coordinate: null })).toMatchObject({ availability: 'unavailable', compliance: 'UNKNOWN' });
  });
  it('retains the provided compliance without computing it from a route', () => {
    expect(presentTrackingVehicle({ ...observation, compliance: 'ON_ROUTE' }).compliance).toBe('ON_ROUTE');
    expect(presentTrackingVehicle({ ...observation, compliance: 'UNKNOWN' }).compliance).toBe('UNKNOWN');
  });
  it('clears protected details after scope denial', () => {
    expect(presentTracking(trackingFixture('denied')).vehicles).toEqual([]);
  });
  it('cannot use fixture-like data in an unavailable operational source', () => {
    expect(presentTracking({ source: 'unavailable', availability: 'ready', vehicles: [observation] })).toEqual(unavailableTracking);
  });
  it('keeps empty scope separate from an unavailable source', () => {
    expect(presentTracking(trackingFixture('ready', true))).toMatchObject({ availability: 'ready', vehicles: [] });
  });
});

describe('TrackingPanelComponent', () => {
  it('defaults to unknown/unavailable without fabricated zero metrics or locations', async () => {
    const fixture = TestBed.createComponent(TrackingPanelComponent); fixture.detectChanges(); await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Tracking unavailable'); expect(text).not.toContain('DEMO ONLY');
    expect(text).not.toContain('ON_ROUTE'); expect(text).not.toContain('OFF_ROUTE');
  });
  it('labels fixture data and clears the warning and location when stale', async () => {
    const fixture = TestBed.createComponent(TrackingPanelComponent);
    fixture.componentRef.setInput('snapshot', trackingFixture('ready')); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('DEVELOPMENT FIXTURE');
    expect(fixture.nativeElement.textContent).toContain('Off-route warning — fixture state');
    fixture.componentRef.setInput('snapshot', trackingFixture('stale')); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('UNKNOWN');
    expect(fixture.nativeElement.textContent).not.toContain('Off-route warning');
    expect(fixture.nativeElement.textContent).not.toContain('123.9');
    fixture.componentRef.setInput('snapshot', trackingFixture('denied')); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('DEMO ONLY');
  });
});
