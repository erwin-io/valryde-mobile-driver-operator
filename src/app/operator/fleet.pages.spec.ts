import { HttpErrorResponse } from '@angular/common/http';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { DriverGroupPage } from '../driver/driver-group.page';
import { DriverHomePage } from '../driver/driver-home.page';
import { FleetApiService } from '../core/fleet-api.service';
import type { DriverDirectoryEntry, FleetGroup, GpsSetupRequest, Jeepney, TransitRoute, VehicleApplication } from '../core/fleet.models';
import { DriversPage } from './drivers.page';
import { FleetHubPage } from './fleet-hub.page';
import { GroupDetailPage } from './group-detail.page';
import { GroupFormPage } from './group-form.page';
import { GroupsPage } from './groups.page';
import { JeepneyDetailPage } from './jeepney-detail.page';
import { JeepneyFormPage } from './jeepney-form.page';
import { JeepneysPage } from './jeepneys.page';
import { OperatorDashboardPage } from './operator-dashboard.page';
import { RequestsPage } from './requests.page';
import { TransitDetailPage } from './transit-detail.page';
import { TransitsPage } from './transits.page';

const jeepney = (over: Partial<Jeepney> = {}): Jeepney => ({
  id: 'j-1',
  operatorId: 'op-1',
  plateNo: 'ABC 123',
  colorHex: '#1E88E5',
  description: null,
  status: 'DRAFT',
  approvedAt: null,
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  ...over,
});
const application = (over: Partial<VehicleApplication> = {}): VehicleApplication => ({
  id: 'a-1',
  jeepneyId: 'j-1',
  submittedByUserId: 'u-1',
  status: 'PENDING',
  applicantNotes: null,
  reviewNotes: null,
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: '2026-10-22T01:00:00Z',
  updatedAt: '2026-10-22T01:00:00Z',
  ...over,
});
const group = (over: Partial<FleetGroup> = {}): FleetGroup => ({
  id: 'g-1',
  operatorId: 'op-1',
  name: 'North',
  description: null,
  status: 'ACTIVE',
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  ...over,
});
const driver = (over: Partial<DriverDirectoryEntry> = {}): DriverDirectoryEntry => ({
  driverId: 'd-1',
  userId: 'u-driver-1',
  email: 'juan@example.test',
  displayName: 'Juan Dela Cruz',
  status: 'ACTIVE',
  userStatus: 'ACTIVE',
  emailVerified: true,
  operatorId: 'op-1',
  activeJeepneyId: null,
  groupIds: [],
  createdAt: '2026-10-22T00:00:00Z',
  ...over,
});
const gpsRequest = (over: Partial<GpsSetupRequest> = {}): GpsSetupRequest => ({
  id: 'gps-1',
  vehicleApplicationId: 'a-1',
  jeepneyId: 'j-1',
  requestedByUserId: 'u-1',
  status: 'PENDING',
  verificationStatus: 'NOT_STARTED',
  scheduledAt: null,
  installedAt: null,
  rejectedReason: null,
  verificationChecks: {},
  verifiedByUserId: null,
  verifiedAt: null,
  createdAt: '2026-10-22T02:00:00Z',
  updatedAt: '2026-10-22T02:00:00Z',
  ...over,
});
const transitRoute: TransitRoute = {
  id: 'r-1',
  routeCode: 'T101',
  publicName: 'Cubao – Quiapo',
  description: null,
  routeColorHex: '#E53935',
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  directions: [
    { id: 'd-1', routeId: 'r-1', directionLabel: 'Southbound', originName: 'Cubao', destinationName: 'Quiapo', geometry: { type: 'LineString', coordinates: [] }, corridorM: 100, status: 'ACTIVE', createdAt: '', updatedAt: '' },
  ],
};
const rejected = (status: number, code: string, message = code) =>
  throwError(() => new HttpErrorResponse({ status, error: { error: { code, message } } }));

describe('Operator fleet pages', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let api: Record<
    | 'currentAssignment'
    | 'listGroupMembers'
    | 'removeGroupMember'
    | 'unassignDriver'
    | 'listJeepneys'
    | 'createJeepney'
    | 'updateJeepney'
    | 'effectiveRoute'
    | 'listGroups'
    | 'createGroup'
    | 'updateGroup'
    | 'listApplications'
    | 'submitApplication'
    | 'listGpsRequests'
    | 'submitGpsRequest'
    | 'listRoutes'
    | 'getRoute'
    | 'assignRoute'
    | 'listRouteAssignments'
    | 'listDrivers'
    | 'assignDriver'
    | 'addDriverToGroup'
    | 'addJeepneyToGroup',
    Mock
  >;

  const render = async <T,>(page: Type<T>, params: Record<string, string> = {}, inputs: Record<string, unknown> = {}) => {
    TestBed.configureTestingModule({
      imports: [page],
      providers: [
        provideRouter([]),
        { provide: FleetApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap({}) } } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(page);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    const settle = async () => {
      for (let pass = 0; pass < 2; pass += 1) {
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
        fixture.detectChanges();
      }
    };
    await settle();
    const instance = fixture.componentInstance as unknown as {
      form: { setValue(v: object): void; patchValue(v: object): void };
      notes: { setValue(v: string): void };
    };
    const submit = async (selector = 'form') => {
      (fixture.nativeElement as HTMLElement).querySelector(selector)?.dispatchEvent(new Event('submit'));
      await settle();
    };
    return { fixture, navigate, settle, submit, instance, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  beforeEach(() => {
    api = {
      currentAssignment: vi.fn(() => of({ jeepneyId: 'j-1' })),
      listGroupMembers: vi.fn(() => of({ members: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } })),
      removeGroupMember: vi.fn(() => of(undefined)),
      unassignDriver: vi.fn(() => of({})),
      listJeepneys: vi.fn(() => of([jeepney(), jeepney({ id: 'j-2', plateNo: 'XYZ 789', status: 'ACTIVE' })])),
      createJeepney: vi.fn(() => of(jeepney({ id: 'j-new' }))),
      updateJeepney: vi.fn(() => of(jeepney())),
      effectiveRoute: vi.fn(() => of(null)),
      listGroups: vi.fn(() => of([group()])),
      createGroup: vi.fn(() => of(group({ id: 'g-new' }))),
      updateGroup: vi.fn(() => of(group())),
      listApplications: vi.fn(() => of([])),
      submitApplication: vi.fn(() => of(application())),
      listGpsRequests: vi.fn(() => of([])),
      submitGpsRequest: vi.fn(() => of(gpsRequest())),
      listRoutes: vi.fn(() => of({ routes: [transitRoute], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })),
      getRoute: vi.fn(() => of(transitRoute)),
      assignRoute: vi.fn((routeDirectionId, target) => of({ id: 'ra-1', routeDirectionId, jeepneyId: target.jeepneyId ?? null, groupId: target.groupId ?? null, activeTo: null })),
      listRouteAssignments: vi.fn(target => of({ assignments: [{ id: 'ra-1', routeDirectionId: 'd-1', jeepneyId: target.jeepneyId ?? null, groupId: target.groupId ?? null, activeTo: null }], pagination: { totalPages: 1 } })),
      listDrivers: vi.fn(() =>
        of({ drivers: [driver()], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
      ),
      assignDriver: vi.fn(() => of({ id: 'da-1', driverId: 'd-1', jeepneyId: 'j-1', active: true })),
      addDriverToGroup: vi.fn(() => of('Driver added')),
      addJeepneyToGroup: vi.fn(() => of('Jeepney added')),
    };
  });

  describe('DriversPage (O08)', () => {
    it('lists the Operator-scoped directory with server totals and assignment state', async () => {
      api.listDrivers.mockReturnValue(
        of({
          drivers: [driver({ activeJeepneyId: 'j-1', groupIds: ['g-1'] })],
          pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
        }),
      );
      const { text } = await render(DriversPage);
      expect(api.listDrivers).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 20 });
      expect(text()).toContain('Juan Dela Cruz');
      expect(text()).toContain('Assigned to ABC 123');
      expect(text()).toContain('1 group');
      expect(text()).toContain('3 drivers in this scope');
    });

    it('passes trimmed search to the server and handles an empty result', async () => {
      const { fixture, settle, text } = await render(DriversPage);
      api.listDrivers.mockReturnValue(of({ drivers: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }));
      (fixture.componentInstance as unknown as { search(value: string): void }).search('  maria  ');
      await settle();
      expect(api.listDrivers).toHaveBeenLastCalledWith({ q: 'maria', page: 1, pageSize: 20 });
      expect(text()).toContain('No Driver matches your search.');
    });

    it('shows the server rejection without exposing an unscoped fallback', async () => {
      api.listDrivers.mockReturnValue(rejected(403, 'FORBIDDEN', 'Active operator profile required'));
      const { text } = await render(DriversPage);
      expect(text()).toContain('Active operator profile required');
      expect(text()).toContain('Try again');
    });

    it('ignores a stale search response that finishes after a newer query', async () => {
      const oldSearch = new Subject<{ drivers: DriverDirectoryEntry[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>();
      const { fixture, settle, text } = await render(DriversPage);
      api.listDrivers
        .mockReturnValueOnce(oldSearch)
        .mockReturnValueOnce(
          of({ drivers: [driver({ driverId: 'd-new', displayName: 'Maria Santos' })], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
        );
      const page = fixture.componentInstance as unknown as { search(value: string): void };
      page.search('old');
      page.search('maria');
      await settle();
      oldSearch.next({ drivers: [driver({ displayName: 'Old Result' })], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
      oldSearch.complete();
      await settle();
      expect(text()).toContain('Maria Santos');
      expect(text()).not.toContain('Old Result');
    });
  });

  describe('JeepneysPage (O03)', () => {
    it('lists the server-scoped jeepneys with server statuses', async () => {
      const { text } = await render(JeepneysPage);
      expect(text()).toContain('ABC 123');
      expect(text()).toContain('Draft');
      expect(text()).toContain('Active');
    });

    it('filters by plate on the client', async () => {
      const { fixture, text } = await render(JeepneysPage);
      (fixture.componentInstance as unknown as { query: { set(v: string): void } }).query.set('xyz');
      fixture.detectChanges();
      expect(text()).toContain('XYZ 789');
      expect(text()).not.toContain('ABC 123');
    });

    it('shows an empty fleet', async () => {
      api.listJeepneys.mockReturnValue(of([]));
      expect((await render(JeepneysPage)).text()).toContain('No jeepneys yet');
    });

    it('shows a server rejection (RBAC-negative) instead of data', async () => {
      api.listJeepneys.mockReturnValue(rejected(403, 'FORBIDDEN', 'Active operator profile required'));
      const { text } = await render(JeepneysPage);
      expect(text()).toContain('Active operator profile required');
      expect(text()).toContain('Try again');
    });
  });

  describe('JeepneyFormPage (O04/O06)', () => {
    it('creates with trimmed plate, uppercase color and no empty description', async () => {
      const { instance, submit, navigate } = await render(JeepneyFormPage);
      instance.form.setValue({ plateNo: '  abc 123 ', colorHex: '#1e88e5', description: '  ' });
      await submit();
      expect(api.createJeepney).toHaveBeenCalledWith({ plateNo: 'abc 123', colorHex: '#1E88E5' });
      expect(navigate).toHaveBeenCalledWith(['/operator/fleet/jeepneys', 'j-new'], { replaceUrl: true });
    });

    it('rejects an invalid color or blank plate without calling the API', async () => {
      const { instance, submit } = await render(JeepneyFormPage);
      instance.form.setValue({ plateNo: 'ABC 1', colorHex: 'blue', description: '' });
      await submit();
      instance.form.setValue({ plateNo: '   ', colorHex: '#000000', description: '' });
      await submit();
      expect(api.createJeepney).not.toHaveBeenCalled();
    });

    it('shows a duplicate plate conflict from the server', async () => {
      api.createJeepney.mockReturnValue(rejected(409, 'CONFLICT', 'A jeepney with this plate number already exists'));
      const { instance, submit, text } = await render(JeepneyFormPage);
      instance.form.setValue({ plateNo: 'ABC 123', colorHex: '#000000', description: '' });
      await submit();
      expect(text()).toContain('A jeepney with this plate number already exists');
    });

    it('serializes create submissions while the server response is pending', async () => {
      const pending = new Subject<Jeepney>();
      api.createJeepney.mockReturnValue(pending);
      const { instance, fixture, settle } = await render(JeepneyFormPage);
      instance.form.setValue({ plateNo: 'ABC 123', colorHex: '#1E88E5', description: '' });
      const page = fixture.componentInstance as unknown as { save(): Promise<void> };
      const first = page.save();
      const second = page.save();
      expect(api.createJeepney).toHaveBeenCalledTimes(1);
      pending.next(jeepney({ id: 'j-new' }));
      pending.complete();
      await Promise.all([first, second]);
      await settle();
    });

    it('edits only color and description; plate and status are never sent', async () => {
      const { instance, submit } = await render(JeepneyFormPage, { id: 'j-1' });
      instance.form.patchValue({ colorHex: '#00aa00', description: 'Blue stripes' });
      await submit();
      expect(api.updateJeepney).toHaveBeenCalledWith('j-1', { colorHex: '#00AA00', description: 'Blue stripes' });
      const body = api.updateJeepney.mock.calls[0][1] as object;
      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('plateNo');
    });

    it("cannot open another operator's jeepney (absent from the scoped list)", async () => {
      const { text, submit } = await render(JeepneyFormPage, { id: 'other-operators-jeepney' });
      expect(text()).toContain('Jeepney not available');
      await submit();
      expect(api.updateJeepney).not.toHaveBeenCalled();
    });

    it('shows a server ownership rejection on update', async () => {
      api.updateJeepney.mockReturnValue(rejected(403, 'FORBIDDEN', 'Jeepney does not belong to this operator'));
      const { instance, submit, text } = await render(JeepneyFormPage, { id: 'j-1' });
      instance.form.patchValue({ colorHex: '#000000' });
      await submit();
      expect(text()).toContain('Jeepney does not belong to this operator');
    });
  });

  describe('JeepneyDetailPage (O05/O07)', () => {
    it("shows nothing for another operator's jeepney and does not query its route", async () => {
      const { text } = await render(JeepneyDetailPage, { id: 'other-operators-jeepney' });
      expect(text()).toContain('Jeepney not available');
      expect(api.effectiveRoute).not.toHaveBeenCalled();
    });

    it('offers submission for a DRAFT jeepney without an open application', async () => {
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('No application submitted yet.');
      expect(text()).toContain('Submit for approval');
    });

    it('does not offer submission while an application is pending', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'PENDING_APPROVAL' })]));
      api.listApplications.mockReturnValue(of([application()]));
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Pending');
      expect(text()).not.toContain('Submit for approval');
    });

    it('shows Admin review notes on a rejected application and allows resubmission', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'REJECTED' })]));
      api.listApplications.mockReturnValue(of([application({ status: 'REJECTED', reviewNotes: 'Plate photo unreadable' })]));
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Plate photo unreadable');
      expect(text()).toContain('Submit for approval');
    });

    it('after submitting, shows the status the server now holds (no client-side transition)', async () => {
      const { instance, submit, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'PENDING_APPROVAL' })]));
      api.listApplications.mockReturnValue(of([application()]));
      instance.notes.setValue('  Ready for inspection ');
      await submit('section form');
      expect(api.submitApplication).toHaveBeenCalledWith('j-1', 'Ready for inspection');
      expect(api.listJeepneys).toHaveBeenCalledTimes(2);
      expect(text()).toContain('Pending approval');
    });

    it('keeps the server status when submission is rejected', async () => {
      api.submitApplication.mockReturnValue(rejected(409, 'CONFLICT', 'This jeepney already has an open application'));
      const { submit, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      await submit('section form');
      expect(text()).toContain('This jeepney already has an open application');
      expect(text()).toContain('Draft');
    });

    it.each([
      [of(null), 'No route assigned.'],
      [rejected(409, 'ROUTE_ASSIGNMENT_CONFLICT'), 'more than one group with a route'],
    ])('renders the effective route state', async (response, expected) => {
      api.effectiveRoute.mockReturnValue(response);
      expect((await render(JeepneyDetailPage, { id: 'j-1' })).text()).toContain(expected);
    });

    it('renders a direct effective route from the server resolver', async () => {
      api.effectiveRoute.mockReturnValue(
        of({ source: 'DIRECT', assignmentId: 'as-1', groupId: null, activeFrom: '', direction: { originName: 'Cubao', destinationName: 'Quiapo', directionLabel: 'Southbound' } }),
      );
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Assigned directly');
      expect(text()).toContain('Cubao → Quiapo');
    });

    it('shows the current assignment reported by G1', async () => {
      api.listDrivers.mockReturnValue(
        of({ drivers: [driver({ activeJeepneyId: 'j-1' })], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
      );
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Currently assigned');
      expect(text()).toContain('Juan Dela Cruz');
      expect(text()).toContain('Assigned');
    });

    it('requires confirmation and assigns with the Driver business ID', async () => {
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      const page = fixture.componentInstance as unknown as {
        pendingDriver: { set(value: DriverDirectoryEntry | null): void };
        assignDriver(): Promise<void>;
      };
      page.pendingDriver.set(driver());
      fixture.detectChanges();
      expect(text()).toContain('replaces any active assignment held by this Driver or jeepney');
      await page.assignDriver();
      await settle();
      expect(api.assignDriver).toHaveBeenCalledWith('j-1', 'd-1');
      expect(api.listDrivers).toHaveBeenLastCalledWith({ page: 1, pageSize: 100 });
      expect(text()).toContain('Assignment accepted. Driver directory refreshed.');
    });

    it.each([
      [403, 'FORBIDDEN', 'Driver is outside this Operator scope'],
      [404, 'NOT_FOUND', 'Driver or jeepney was not found'],
      [409, 'CONFLICT', 'Driver or jeepney already has a conflicting assignment'],
    ])('shows a %s assignment rejection without reporting success', async (status, code, message) => {
      api.assignDriver.mockReturnValue(rejected(status, code, message));
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      const page = fixture.componentInstance as unknown as {
        pendingDriver: { set(value: DriverDirectoryEntry | null): void };
        assignDriver(): Promise<void>;
      };
      page.pendingDriver.set(driver());
      await page.assignDriver();
      await settle();
      expect(api.assignDriver).toHaveBeenCalledWith('j-1', 'd-1');
      expect(text()).toContain(message);
      expect(text()).not.toContain('is now assigned to this jeepney');
    });

    it('does not offer an ineligible Driver for assignment', async () => {
      api.listDrivers.mockReturnValue(
        of({ drivers: [driver({ status: 'DISABLED' })], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
      );
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('No active, verified Driver is available to assign.');
      expect(text()).not.toContain('Juan Dela CruzNo active jeepney assignmentAssign');
    });

    it('keeps the rest of the vehicle detail available when G1 rejects the directory', async () => {
      api.listDrivers.mockReturnValue(rejected(503, 'SERVICE_UNAVAILABLE', 'Driver directory is temporarily unavailable'));
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('ABC 123');
      expect(text()).toContain('VALRYDE is unavailable right now. Check your connection and try again.');
    });
  });

  describe('Groups (O12–O15)', () => {
    it('lists groups and shows an empty state', async () => {
      expect((await render(GroupsPage)).text()).toContain('North');
      TestBed.resetTestingModule();
      api.listGroups.mockReturnValue(of([]));
      expect((await render(GroupsPage)).text()).toContain('No groups yet');
    });

    it('creates a group with trimmed fields', async () => {
      const { instance, submit, navigate } = await render(GroupFormPage);
      instance.form.patchValue({ name: '  South  ', description: '' });
      await submit();
      expect(api.createGroup).toHaveBeenCalledWith({ name: 'South' });
      expect(navigate).toHaveBeenCalledWith(['/operator/fleet/groups', 'g-new'], { replaceUrl: true });
    });

    it('edits name, description and status', async () => {
      const { instance, submit } = await render(GroupFormPage, { id: 'g-1' });
      instance.form.setValue({ name: 'North', description: 'Morning shift', status: 'INACTIVE' });
      await submit();
      expect(api.updateGroup).toHaveBeenCalledWith('g-1', { name: 'North', description: 'Morning shift', status: 'INACTIVE' });
    });

    it("cannot open another operator's group", async () => {
      expect((await render(GroupFormPage, { id: 'other-group' })).text()).toContain('Group not available');
      TestBed.resetTestingModule();
      expect((await render(GroupDetailPage, { id: 'other-group' })).text()).toContain('Group not available');
    });

    it('renders authoritative membership including disabled Drivers', async () => {
      api.listGroupMembers.mockReturnValue(of({ members: [{ memberType: 'DRIVER', driverId: 'd-1', displayName: 'Juan Dela Cruz', status: 'DISABLED', activeJeepneyId: null, joinedAt: '' }], pagination: { page: 1, total: 1, totalPages: 1 } }));
      api.listDrivers.mockReturnValue(
        of({ drivers: [driver({ groupIds: ['g-1'] })], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
      );
      const { text } = await render(GroupDetailPage, { id: 'g-1' });
      expect(text()).toContain('Juan Dela Cruz');
      expect(text()).toContain('Disabled');
      expect(text()).toContain('Remove');
      expect(api.listGroupMembers).toHaveBeenCalledWith('g-1', 1);
    });

    it('adds a Driver and jeepney with their business IDs', async () => {
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as {
        addDriver(value: DriverDirectoryEntry): Promise<void>;
        addJeepney(value: Jeepney): Promise<void>;
      };
      await page.addDriver(driver());
      await settle();
      expect(api.addDriverToGroup).toHaveBeenCalledWith('g-1', 'd-1');
      expect(text()).toContain('Membership refreshed.');
      await page.addJeepney(jeepney());
      await settle();
      expect(api.addJeepneyToGroup).toHaveBeenCalledWith('g-1', 'j-1');
      expect(text()).toContain('was added. Membership refreshed.');
    });

    it('serializes group additions while a mutation is pending', async () => {
      const pending = new Subject<string>();
      api.addDriverToGroup.mockReturnValue(pending);
      const { fixture, settle } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as { addDriver(value: DriverDirectoryEntry): Promise<void> };
      const first = page.addDriver(driver());
      const second = page.addDriver(driver({ driverId: 'd-2' }));
      expect(api.addDriverToGroup).toHaveBeenCalledTimes(1);
      pending.next('Driver added');
      pending.complete();
      await Promise.all([first, second]);
      await settle();
    });
  });

  describe('Dashboard and Driver home (D5)', () => {
    it('counts server-scoped jeepneys and groups; tracking stays gated', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney(), jeepney({ id: 'j-2', status: 'ACTIVE' }), jeepney({ id: 'j-3', status: 'PENDING_APPROVAL' })]));
      const { text } = await render(OperatorDashboardPage);
      expect(text()).toMatch(/Jeepneys\s*3\s*1 active/);
      expect(text()).toMatch(/Awaiting approval\s*1/);
      expect(text()).toMatch(/Fleet groups\s*1/);
      expect(text()).toMatch(/Drivers\s*1/);
      expect(text()).toContain('appear once GPS tracking is connected');
    });

    it('loads nothing in the foundation preview', async () => {
      await render(OperatorDashboardPage, {}, { foundationPreview: true });
      expect(api.listJeepneys).not.toHaveBeenCalled();
    });

    it('keeps the newest dashboard refresh when an older response finishes late', async () => {
      const oldJeepneys = new Subject<Jeepney[]>();
      const oldGroups = new Subject<FleetGroup[]>();
      const oldDrivers = new Subject<{ drivers: DriverDirectoryEntry[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>();
      const { fixture, settle, text } = await render(OperatorDashboardPage);
      api.listJeepneys.mockReturnValueOnce(oldJeepneys).mockReturnValueOnce(of([jeepney({ id: 'new' })]));
      api.listGroups.mockReturnValueOnce(oldGroups).mockReturnValueOnce(of([group(), group({ id: 'g-2' })]));
      api.listDrivers
        .mockReturnValueOnce(oldDrivers)
        .mockReturnValueOnce(of({ drivers: [], pagination: { page: 1, pageSize: 1, total: 4, totalPages: 4 } }));
      const page = fixture.componentInstance as unknown as { load(): Promise<void> };
      const stale = page.load();
      await page.load();
      oldJeepneys.next([jeepney(), jeepney({ id: 'old-2' }), jeepney({ id: 'old-3' })]);
      oldJeepneys.complete();
      oldGroups.next([group()]);
      oldGroups.complete();
      oldDrivers.next({ drivers: [], pagination: { page: 1, pageSize: 1, total: 9, totalPages: 9 } });
      oldDrivers.complete();
      await stale;
      await settle();
      expect(text()).toMatch(/Jeepneys\s*1/);
      expect(text()).toMatch(/Fleet groups\s*2/);
      expect(text()).toMatch(/Drivers\s*4/);
      expect(text()).not.toMatch(/Drivers\s*9/);
    });

    it('keeps independent Fleet hub counts when one source fails', async () => {
      api.listDrivers.mockReturnValue(rejected(503, 'SERVICE_UNAVAILABLE'));
      const { text } = await render(FleetHubPage);
      expect(text()).toMatch(/My jeepneys[\s\S]*2/);
      expect(text()).toMatch(/Fleet groups[\s\S]*1/);
      expect(text()).toMatch(/Drivers[\s\S]*—/);
    });

    it('shows only the assigned jeepney and its server route summary', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'ACTIVE' }), jeepney({ id: 'j-2', plateNo: 'XYZ 789' })]));
      api.effectiveRoute.mockImplementation((id: string) =>
        id === 'j-1' ? of({ direction: transitRoute.directions[0] }) : rejected(409, 'ROUTE_ASSIGNMENT_CONFLICT'),
      );
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Your assigned jeepney');
      expect(text()).not.toContain('XYZ 789');
      expect(text()).toContain('Cubao → Quiapo');
      expect(api.effectiveRoute).not.toHaveBeenCalledWith('j-2');
    });

    it.each(['route', 'direction'])('withholds My Jeepney guidance when the published %s is inactive', async inactive => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'ACTIVE' })]));
      api.effectiveRoute.mockReturnValue(of({ direction: transitRoute.directions[0] }));
      api.getRoute.mockReturnValue(of(inactive === 'route'
        ? { ...transitRoute, status: 'INACTIVE' }
        : { ...transitRoute, directions: [{ ...transitRoute.directions[0], status: 'INACTIVE' }] }));
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Official route unavailable');
      expect(text()).not.toContain('Cubao → Quiapo');
    });

    it('shows the no-assignment state for a Driver without jeepneys', async () => {
      api.currentAssignment.mockReturnValue(of(null));
      expect((await render(DriverHomePage)).text()).toContain('No assigned jeepney');
      expect(api.listJeepneys).not.toHaveBeenCalled();
    });

    it('does not present a route as usable for an inactive assigned jeepney', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'INACTIVE' })]));
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Route guidance unavailable until this jeepney is active');
      expect(api.effectiveRoute).not.toHaveBeenCalled();
    });
  });


  describe('Merged G2/G3/G4 takeover', () => {
    const member = { memberType: 'DRIVER' as const, driverId: 'd-1', displayName: 'Member One', status: 'DISABLED' as const, activeJeepneyId: null, joinedAt: '2026-10-23T00:00:00Z' };
    const membersResponse = (members: object[], page = 1, totalPages = 1) => of({ members, pagination: { page, pageSize: 100, total: 2, totalPages } });
    interface GroupPage {
      pendingRemoval: { set(value: typeof member | null): void };
      removeMember(): Promise<void>;
      loadMembership(reset?: boolean): Promise<boolean>;
      load(): Promise<void>;
      members(): object[];
    };
    interface VehiclePage { confirmUnassign: { set(value: boolean): void }; unassignDriver(): Promise<void> }

    it('appends authoritative membership pages without inferring them from the directory', async () => {
      api.listGroupMembers.mockReturnValueOnce(membersResponse([member], 1, 2)).mockReturnValueOnce(membersResponse([{ ...member, driverId: 'd-2', displayName: 'Member Two' }], 2, 2));
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      expect(text()).toContain('Load more members');
      await (fixture.componentInstance as unknown as GroupPage).loadMembership(false);
      await settle();
      expect(api.listGroupMembers).toHaveBeenLastCalledWith('g-1', 2);
      expect(text()).toContain('Member One'); expect(text()).toContain('Member Two');
      expect(text()).not.toContain('Load more members');
    });

    it('requires confirmation, serializes removal, and reconciles server membership', async () => {
      api.listGroupMembers.mockReturnValue(membersResponse([member]));
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as GroupPage;
      await page.removeMember();
      expect(api.removeGroupMember).not.toHaveBeenCalled();
      page.pendingRemoval.set(member);
      fixture.detectChanges(); expect(text()).toContain('Remove Member One?');
      const pending = new Subject<void>(); api.removeGroupMember.mockReturnValue(pending);
      const first = page.removeMember(); const second = page.removeMember();
      expect(api.removeGroupMember).toHaveBeenCalledTimes(1);
      expect(api.removeGroupMember).toHaveBeenCalledWith('g-1', member);
      api.listGroupMembers.mockReturnValue(membersResponse([]));
      pending.next(undefined); pending.complete(); await Promise.all([first, second]); await settle();
      expect(text()).toContain('Member removed. Membership refreshed.');
      expect(text()).not.toContain('Member One');
    });

    it.each([401, 403, 404])('clears protected membership after a %s read failure', async status => {
      api.listGroupMembers.mockReturnValue(membersResponse([member]));
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      api.listGroupMembers.mockReturnValue(rejected(status, status === 404 ? 'NOT_FOUND' : 'FORBIDDEN'));
      await (fixture.componentInstance as unknown as GroupPage).loadMembership(); await settle();
      expect(text()).not.toContain('Member One'); expect(text()).toContain('Group membership unavailable');
    });

    it('preserves removal failure and reconciles instead of claiming success', async () => {
      api.listGroupMembers.mockReturnValue(membersResponse([member]));
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as GroupPage;
      page.pendingRemoval.set(member); api.removeGroupMember.mockReturnValue(rejected(404, 'NOT_FOUND'));
      await page.removeMember(); await settle();
      expect(text()).not.toContain('Member removed.');
      expect(api.listGroupMembers).toHaveBeenCalledTimes(2);
    });

    it('ignores a stale membership result after a newer read', async () => {
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as GroupPage;
      const pending = new Subject<unknown>(); api.listGroupMembers.mockReturnValueOnce(pending).mockReturnValueOnce(membersResponse([]));
      const stale = page.loadMembership(); await page.loadMembership();
      pending.next({ members: [member], pagination: { page: 1, total: 1, totalPages: 1 } }); pending.complete();
      await stale; await settle(); expect(text()).not.toContain('Member One');
    });

    it('invalidates pending member reads when a group disappears on refresh', async () => {
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as GroupPage;
      const pending = new Subject<unknown>(); api.listGroupMembers.mockReturnValue(pending);
      const stale = page.loadMembership(); api.listGroups.mockReturnValue(of([])); await page.load();
      pending.next({ members: [member], pagination: {} }); pending.complete(); await stale; await settle();
      expect(page.members()).toEqual([]); expect(text()).toContain('Group not available');
    });

    it('does not claim confirmed membership when post-removal reconciliation fails', async () => {
      api.listGroupMembers.mockReturnValue(membersResponse([member]));
      const { fixture, settle, text } = await render(GroupDetailPage, { id: 'g-1' });
      const page = fixture.componentInstance as unknown as GroupPage; page.pendingRemoval.set(member);
      api.listGroupMembers.mockReturnValue(rejected(503, 'SERVICE_UNAVAILABLE'));
      await page.removeMember(); await settle();
      expect(text()).toContain('Removal accepted. Refresh membership'); expect(text()).not.toContain('Member removed. Membership refreshed.');
    });

    it('unassigns only after confirmation and reconciles before displaying success', async () => {
      api.listDrivers.mockReturnValue(of({ drivers: [driver({ activeJeepneyId: 'j-1', status: 'DISABLED' })], pagination: { totalPages: 1 } }));
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      const page = fixture.componentInstance as unknown as VehiclePage;
      await page.unassignDriver(); expect(api.unassignDriver).not.toHaveBeenCalled();
      page.confirmUnassign.set(true);
      const pending = new Subject<unknown>(); api.unassignDriver.mockReturnValue(pending);
      const first = page.unassignDriver(); const second = page.unassignDriver();
      expect(api.unassignDriver).toHaveBeenCalledTimes(1);
      api.listDrivers.mockReturnValue(of({ drivers: [driver()], pagination: { totalPages: 1 } }));
      pending.next({}); pending.complete(); await Promise.all([first, second]); await settle();
      expect(api.unassignDriver).toHaveBeenCalledWith('j-1');
      expect(text()).toContain('Driver unassigned. Assignment state refreshed.'); expect(text()).not.toContain('Currently assigned');
    });

    it('finds an assigned disabled Driver beyond the first directory page', async () => {
      api.listDrivers.mockReturnValueOnce(of({ drivers: [driver()], pagination: { totalPages: 2 } })).mockReturnValueOnce(of({ drivers: [driver({ driverId: 'disabled', displayName: 'Assigned Disabled Driver', status: 'DISABLED', activeJeepneyId: 'j-1' })], pagination: { totalPages: 2 } }));
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(api.listDrivers).toHaveBeenLastCalledWith({ page: 2, pageSize: 100 });
      expect(text()).toContain('Assigned Disabled Driver'); expect(text()).toContain('Unassign');
    });

    it.each([403, 409, 503])('reconciles a %s unassignment failure without a success message', async status => {
      api.listDrivers.mockReturnValue(of({ drivers: [driver({ activeJeepneyId: 'j-1' })], pagination: { totalPages: 1 } }));
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      const page = fixture.componentInstance as unknown as VehiclePage; page.confirmUnassign.set(true);
      api.unassignDriver.mockReturnValue(rejected(status, status === 409 ? 'CONFLICT' : 'FORBIDDEN'));
      await page.unassignDriver(); await settle();
      expect(text()).not.toContain('Driver unassigned.'); expect(api.listDrivers).toHaveBeenCalledTimes(2);
    });

    it('clears old Driver data after assignment revocation on re-entry', async () => {
      const { fixture, settle, text } = await render(DriverHomePage);
      api.currentAssignment.mockReturnValue(of(null));
      await (fixture.componentInstance as unknown as { load(): Promise<void> }).load(); await settle();
      expect(text()).toContain('No assigned jeepney'); expect(text()).not.toContain('ABC 123');
    });

    it('clears Driver vehicle details when route access is revoked', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'ACTIVE' })]));
      api.effectiveRoute.mockReturnValue(rejected(403, 'FORBIDDEN'));
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Jeepneys unavailable'); expect(text()).not.toContain('ABC 123');
    });

    it('does not substitute an accessible jeepney when the assigned one is missing', async () => {
      api.currentAssignment.mockReturnValue(of({ jeepneyId: 'not-visible' }));
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Jeepneys unavailable'); expect(api.effectiveRoute).not.toHaveBeenCalled();
      expect(text()).not.toContain('ABC 123'); expect(text()).not.toContain('XYZ 789');
    });
  });

  describe('Driver group membership and tracking readiness', () => {
    it('reads only authorized groups and never requests Operator-only Driver directory', async () => {
      api.listGroupMembers.mockReturnValue(of({ members: [{ memberType: 'DRIVER', driverId: 'd-1', displayName: 'Groupmate', status: 'ACTIVE' }], pagination: { page: 1, totalPages: 1, total: 1 } }));
      const { text } = await render(DriverGroupPage);
      expect(text()).toContain('Groupmate'); expect(text()).toContain('Tracking unavailable');
      expect(api.listDrivers).not.toHaveBeenCalled(); expect(api.removeGroupMember).not.toHaveBeenCalled();
      expect(text()).not.toContain('Remove'); expect(text()).not.toContain('Add');
    });

    it('does not choose or read another group when several are permitted', async () => {
      api.listGroups.mockReturnValue(of([group(), group({ id: 'g-2', name: 'Other permitted group' })]));
      const { fixture } = await render(DriverGroupPage);
      await (fixture.componentInstance as unknown as { select(value: FleetGroup): Promise<void> }).select(group({ id: 'not-permitted' }));
      expect(api.listGroupMembers).not.toHaveBeenCalled();
    });

    it('clears groupmate details when visibility is revoked', async () => {
      api.listGroupMembers.mockReturnValue(of({ members: [{ memberType: 'JEEPNEY', jeepneyId: 'j-2', plateNo: 'GROUPMATE ONLY', status: 'ACTIVE' }], pagination: { page: 1, totalPages: 1, total: 1 } }));
      const { fixture, settle, text } = await render(DriverGroupPage);
      expect(text()).toContain('GROUPMATE ONLY');
      api.listGroupMembers.mockReturnValue(rejected(403, 'FORBIDDEN'));
      await (fixture.componentInstance as unknown as { loadMembers(): Promise<void> }).loadMembers(); await settle();
      expect(text()).not.toContain('GROUPMATE ONLY');
    });

    it('clears protected data on group refresh and never substitutes a missing membership', async () => {
      const { fixture, settle, text } = await render(DriverGroupPage);
      api.listGroups.mockReturnValue(of([]));
      await (fixture.componentInstance as unknown as { load(): Promise<void> }).load(); await settle();
      expect(text()).toContain('No group is currently available');
    });
  });

  describe('GPS installation (D4, checklist 55)', () => {
    const clickButton = (root: HTMLElement, label: string) =>
      [...root.querySelectorAll('ion-button')].find((b) => b.textContent?.includes(label))?.dispatchEvent(new Event('click'));

    it('explains that GPS setup waits for Admin approval', async () => {
      api.listApplications.mockReturnValue(of([application({ status: 'PENDING' })]));
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Available after VALRYDE Admin approves');
      expect(text()).not.toContain('Request GPS installation');
    });

    it('requests installation for an approved application and shows the server state', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'APPROVED' })]));
      api.listApplications.mockReturnValue(of([application({ status: 'APPROVED' })]));
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      api.listGpsRequests.mockReturnValue(of([gpsRequest()]));
      clickButton(fixture.nativeElement as HTMLElement, 'Request GPS installation');
      await settle();
      expect(api.submitGpsRequest).toHaveBeenCalledWith('a-1');
      expect(text()).toContain('Installation request');
      expect(text()).toContain('Pending');
      expect(text()).toContain('Tracking starts only after VALRYDE verifies the installed device.');
    });

    it('shows a server workflow rejection without changing anything', async () => {
      api.listJeepneys.mockReturnValue(of([jeepney({ status: 'APPROVED' })]));
      api.listApplications.mockReturnValue(of([application({ status: 'APPROVED' })]));
      api.submitGpsRequest.mockReturnValue(rejected(409, 'VEHICLE_NOT_APPROVED', 'Vehicle application must be approved first'));
      const { fixture, settle, text } = await render(JeepneyDetailPage, { id: 'j-1' });
      clickButton(fixture.nativeElement as HTMLElement, 'Request GPS installation');
      await settle();
      expect(text()).toContain('Vehicle application must be approved first');
      expect(text()).not.toContain('Installation request');
    });

    it('reports installation only as the server states it, with schedule and rejection details', async () => {
      api.listGpsRequests.mockReturnValue(
        of([gpsRequest({ status: 'INSTALLED', verificationStatus: 'PENDING', scheduledAt: '2026-10-25T09:00:00Z', installedAt: '2026-10-25T11:00:00Z' })]),
      );
      const { text } = await render(JeepneyDetailPage, { id: 'j-1' });
      expect(text()).toContain('Installed — awaiting verification');
      expect(text()).toContain('2026-10-25 09:00');
      expect(text()).not.toContain('Verified');
      TestBed.resetTestingModule();
      api.listGpsRequests.mockReturnValue(of([gpsRequest({ status: 'REJECTED', rejectedReason: 'Wiring not accessible' })]));
      expect((await render(JeepneyDetailPage, { id: 'j-1' })).text()).toContain('Wiring not accessible');
    });

    it('lists applications and GPS requests with plates; route-change requests stay gated', async () => {
      api.listApplications.mockReturnValue(of([application()]));
      api.listGpsRequests.mockReturnValue(of([gpsRequest({ status: 'SCHEDULED' })]));
      const { text } = await render(RequestsPage);
      expect(text()).toContain('ABC 123');
      expect(text()).toContain('Installation scheduled');
      expect(text()).toContain('accept route addition or change requests yet');
    });
  });

  describe('Official transits and assignment (D4, checklist 52)', () => {
    interface Detail {
      choose(d: unknown): void;
      assign(v: string): Promise<void>;
      options(): { value: string }[];
    }

    it('lists official routes with server search', async () => {
      const { fixture, settle, text } = await render(TransitsPage);
      expect(text()).toContain('T101 · Cubao – Quiapo');
      (fixture.componentInstance as unknown as { search(q: string): void }).search(' quiapo ');
      await settle();
      expect(api.listRoutes).toHaveBeenLastCalledWith({ q: 'quiapo', page: 1, pageSize: 20 });
    });

    it('shows an empty catalogue', async () => {
      api.listRoutes.mockReturnValue(of({ routes: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }));
      expect((await render(TransitsPage)).text()).toContain('No routes have been published yet.');
    });

    it('offers only the operator-scoped jeepneys and groups as targets', async () => {
      const { fixture } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail;
      expect(page.options().map((o) => o.value)).toEqual(['j:j-1', 'j:j-2', 'g:g-1']);
    });

    it('assigns a direction to exactly one target', async () => {
      const { fixture, settle, text } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail;
      page.choose(transitRoute.directions[0]);
      await page.assign('g:g-1');
      await settle();
      expect(api.assignRoute).toHaveBeenCalledWith('d-1', { groupId: 'g-1' });
      expect(text()).toContain('Group North now uses Cubao → Quiapo.');
    });

    it('does not claim current success when the assignment was replaced before reconciliation', async () => {
      api.listRouteAssignments.mockReturnValue(of({ assignments: [], pagination: { totalPages: 0 } }));
      const { fixture, settle, text } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail; page.choose(transitRoute.directions[0]);
      await page.assign('g:g-1'); await settle();
      expect(text()).toContain('could not be confirmed as current'); expect(text()).not.toContain('now uses');
    });

    it('preserves an accepted command when the subsequent state read fails', async () => {
      api.listRouteAssignments.mockReturnValue(rejected(503, 'SERVICE_UNAVAILABLE'));
      const { fixture, settle, text } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail; page.choose(transitRoute.directions[0]);
      await page.assign('j:j-1'); await settle();
      expect(text()).toContain('Assignment accepted, but its current state could not be checked'); expect(text()).not.toContain('now uses');
      expect(api.assignRoute).toHaveBeenCalledTimes(1);
    });

    it('serializes route assignment while the server mutation is pending', async () => {
      const pending = new Subject<unknown>();
      api.assignRoute.mockReturnValue(pending);
      const { fixture, settle } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail;
      page.choose(transitRoute.directions[0]);
      const first = page.assign('g:g-1');
      const second = page.assign('j:j-1');
      expect(api.assignRoute).toHaveBeenCalledTimes(1);
      pending.next({});
      pending.complete();
      await Promise.all([first, second]);
      await settle();
    });

    it.each([
      [rejected(409, 'ROUTE_ASSIGNMENT_CONFLICT'), 'Assign a route to the jeepney directly instead.'],
      [rejected(409, 'ROUTE_NOT_APPROVED', 'Route and direction must be active before assignment'), 'Route and direction must be active before assignment'],
      [rejected(403, 'FORBIDDEN', 'Assignment target is outside operator scope'), 'Assignment target is outside operator scope'],
    ])('shows server rejections of an assignment', async (response, expected) => {
      api.assignRoute.mockReturnValue(response);
      const { fixture, settle, text } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail;
      page.choose(transitRoute.directions[0]);
      await page.assign('j:j-1');
      await settle();
      expect(text()).toContain(expected);
    });

    it('cannot assign without a fleet', async () => {
      api.listJeepneys.mockReturnValue(of([]));
      api.listGroups.mockReturnValue(of([]));
      const { fixture, text } = await render(TransitDetailPage, { routeId: 'r-1' });
      const page = fixture.componentInstance as unknown as Detail;
      page.choose(transitRoute.directions[0]);
      await page.assign('j:anything');
      expect(api.assignRoute).not.toHaveBeenCalled();
      expect(text()).toContain('Add a jeepney or group to your fleet to assign this route.');
    });
  });
});
