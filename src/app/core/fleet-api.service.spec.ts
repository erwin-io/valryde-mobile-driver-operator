import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';

import { FleetApiService } from './fleet-api.service';
import type { FleetGroupMember, JeepneyUpdate } from './fleet.models';

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

  it('reads only the current Driver assignment, including a null result', () => {
    let result: unknown = 'pending';
    api.currentAssignment().subscribe(value => result = value);
    const request = http.expectOne('/api/me/assignment');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ assignment: null });
    expect(result).toBeNull();
  });

  it('passes G2 pagination and encodes the group identifier', () => {
    api.listGroupMembers('g/1', 2).subscribe();
    const request = http.expectOne(r => r.url === '/api/fleet-groups/g%2F1/members');
    expect(request.request.params.toString()).toBe('page=2&pageSize=100');
    request.flush({ members: [], pagination: {} });
  });

  it.each(['DRIVER', 'JEEPNEY'] as const)('removes a %s membership with a bodyless encoded DELETE', memberType => {
    const member = memberType === 'DRIVER' ? { memberType, driverId: 'd/1' } : { memberType, jeepneyId: 'j/1' };
    api.removeGroupMember('g/1', member as FleetGroupMember).subscribe();
    const request = http.expectOne('/api/fleet-groups/g%2F1/' + (memberType === 'DRIVER' ? 'drivers/d%2F1' : 'jeepneys/j%2F1'));
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('unassigns the current Driver using G4 and returns the closed assignment', () => {
    let result: unknown;
    api.unassignDriver('j/1').subscribe(value => result = value);
    const request = http.expectOne('/api/jeepneys/j%2F1/driver-assignment');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ assignment: { id: 'a-1', activeTo: '2026-10-23T00:00:00Z' } });
    expect(result).toEqual({ id: 'a-1', activeTo: '2026-10-23T00:00:00Z' });
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

  it('passes only approved Operator-safe filters to the G1 Driver directory', () => {
    api.listDrivers({ q: 'juan', status: 'ACTIVE', page: 2, pageSize: 10 }).subscribe();
    const pending = http.expectOne((request) => request.url === '/api/drivers');
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.toString()).toBe('q=juan&status=ACTIVE&page=2&pageSize=10');
    expect(pending.request.params.has('operatorId')).toBe(false);
    expect(pending.request.params.has('associated')).toBe(false);
    pending.flush({ drivers: [], pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 } });
  });

  it('assigns the Driver business ID, never userId', () => {
    api.assignDriver('j/1', 'driver-1').subscribe();
    const pending = http.expectOne('/api/jeepneys/j%2F1/driver-assignment');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual({ driverId: 'driver-1' });
    expect(pending.request.body).not.toHaveProperty('userId');
    pending.flush({ assignment: {} });
  });

  it('adds Driver and jeepney business IDs to a group', () => {
    api.addDriverToGroup('g/1', 'driver-1').subscribe();
    const driver = http.expectOne('/api/fleet-groups/g%2F1/drivers');
    expect(driver.request.body).toEqual({ driverId: 'driver-1' });
    driver.flush({ message: 'Driver added' });

    api.addJeepneyToGroup('g/1', 'jeepney-1').subscribe();
    const jeepney = http.expectOne('/api/fleet-groups/g%2F1/jeepneys');
    expect(jeepney.request.body).toEqual({ jeepneyId: 'jeepney-1' });
    jeepney.flush({ message: 'Jeepney added' });
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
