import { HttpErrorResponse } from '@angular/common/http';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DriverHomePage } from '../driver/driver-home.page';
import { FleetApiService } from '../core/fleet-api.service';
import type { DriverDirectoryEntry, FleetGroup, GpsSetupRequest, Jeepney, TransitRoute, VehicleApplication } from '../core/fleet.models';
import { DriversPage } from './drivers.page';
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
      assignRoute: vi.fn(() => of({})),
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
      expect(api.listDrivers).toHaveBeenLastCalledWith({ status: 'ACTIVE', page: 1, pageSize: 100 });
      expect(text()).toContain('Juan Dela Cruz is now assigned to this jeepney.');
    });

    it.each([
      [403, 'FORBIDDEN', 'Driver is outside this Operator scope'],
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

    it('shows known Driver membership while clearly retaining G2 read/removal gates', async () => {
      api.listDrivers.mockReturnValue(
        of({ drivers: [driver({ groupIds: ['g-1'] })], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
      );
      const { text } = await render(GroupDetailPage, { id: 'g-1' });
      expect(text()).toContain('Juan Dela Cruz');
      expect(text()).toContain('Known member · removal unavailable');
      expect(text()).toContain('G2 does not expose current jeepney membership');
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
      expect(text()).toContain('Known Driver memberships were refreshed.');
      await page.addJeepney(jeepney());
      await settle();
      expect(api.addJeepneyToGroup).toHaveBeenCalledWith('g-1', 'j-1');
      expect(text()).toContain('Membership listing and removal remain unavailable until G2.');
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

    it('lists the jeepneys a Driver can access with server route summaries, without claiming an assignment', async () => {
      api.effectiveRoute.mockImplementation((id: string) =>
        id === 'j-1' ? of({ direction: { originName: 'Cubao', destinationName: 'Quiapo' } }) : rejected(409, 'ROUTE_ASSIGNMENT_CONFLICT'),
      );
      const { text } = await render(DriverHomePage);
      expect(text()).toContain('Jeepneys you can access');
      expect(text()).toContain("doesn't yet show which one you are assigned to");
      expect(text()).toContain('Cubao → Quiapo');
      expect(text()).toContain('Route unavailable — contact your operator');
    });

    it('shows the no-assignment state for a Driver without jeepneys', async () => {
      api.listJeepneys.mockReturnValue(of([]));
      expect((await render(DriverHomePage)).text()).toContain('No authorized jeepney');
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
