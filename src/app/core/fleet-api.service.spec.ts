import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';

import { FleetApiService } from './fleet-api.service';
import type { JeepneyUpdate } from './fleet.models';

describe('FleetApiService', () => {
  let api: FleetApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FleetApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['listJeepneys', '/api/jeepneys', { jeepneys: [] }],
    ['listGroups', '/api/fleet-groups', { groups: [] }],
    ['listApplications', '/api/vehicle-applications', { applications: [] }],
  ] as const)('%s reads the Agent A collection', (method, url, body) => {
    let result: unknown;
    (api[method]() as Observable<unknown>).subscribe((value: unknown) => (result = value));
    const pending = http.expectOne(url);
    expect(pending.request.method).toBe('GET');
    pending.flush(body);
    expect(result).toEqual([]);
  });

  it('creates a jeepney without an operatorId (ownership comes from the session)', () => {
    api.createJeepney({ plateNo: 'ABC 123', colorHex: '#1E88E5' }).subscribe();
    const pending = http.expectOne('/api/jeepneys');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual({ plateNo: 'ABC 123', colorHex: '#1E88E5' });
    expect(pending.request.body).not.toHaveProperty('operatorId');
    pending.flush({ jeepney: {} });
  });

  it('updates only color and description, never status', () => {
    // Even a caller that smuggles extra fields past the type sends only what it passed; the type forbids status.
    const update: JeepneyUpdate = { colorHex: '#000000', description: null };
    api.updateJeepney('j-1', update).subscribe();
    const pending = http.expectOne('/api/jeepneys/j-1');
    expect(pending.request.method).toBe('PATCH');
    expect(pending.request.body).toEqual({ colorHex: '#000000', description: null });
    expect(pending.request.body).not.toHaveProperty('status');
    pending.flush({ jeepney: {} });
  });

  it('encodes path IDs', () => {
    api.effectiveRoute('a/b').subscribe();
    http.expectOne('/api/jeepneys/a%2Fb/effective-route').flush({ effectiveRouteDirection: null });
  });

  it('submits an application without empty notes', () => {
    api.submitApplication('j-1').subscribe();
    const pending = http.expectOne('/api/vehicle-applications');
    expect(pending.request.body).toEqual({ jeepneyId: 'j-1' });
    pending.flush({ application: {} });
  });

  it('creates and updates groups with the Agent A fields only', () => {
    api.createGroup({ name: 'North' }).subscribe();
    const created = http.expectOne('/api/fleet-groups');
    expect(created.request.body).toEqual({ name: 'North' });
    created.flush({ group: {} });
    api.updateGroup('g-1', { status: 'INACTIVE' }).subscribe();
    const updated = http.expectOne('/api/fleet-groups/g-1');
    expect(updated.request.method).toBe('PATCH');
    expect(updated.request.body).toEqual({ status: 'INACTIVE' });
    updated.flush({ group: {} });
  });

  it('submits a GPS request for an application only', () => {
    api.submitGpsRequest('a-1').subscribe();
    const pending = http.expectOne('/api/gps-setup-requests');
    expect(pending.request.body).toEqual({ vehicleApplicationId: 'a-1' });
    pending.flush({ request: {} });
  });

  it('passes search and pagination to the public route list', () => {
    api.listRoutes({ q: 'cubao', page: 2, pageSize: 20 }).subscribe();
    const pending = http.expectOne((r) => r.url === '/api/transit-routes');
    expect(pending.request.params.toString()).toBe('q=cubao&page=2&pageSize=20');
    pending.flush({ routes: [], pagination: {} });
  });

  it('assigns a route direction to exactly one target', () => {
    api.assignRoute('d-1', { jeepneyId: 'j-1' }).subscribe();
    const pending = http.expectOne('/api/route-assignments');
    expect(pending.request.body).toEqual({ routeDirectionId: 'd-1', jeepneyId: 'j-1' });
    pending.flush({ assignment: {} });
  });
});
