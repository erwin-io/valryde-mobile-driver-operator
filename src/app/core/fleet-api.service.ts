import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  EffectiveRouteDirection,
  DriverAssignment,
  DriverDirectoryEntry,
  DriverDirectoryQuery,
  FleetGroup,
  FleetGroupMember,
  FleetGroupCreate,
  FleetGroupUpdate,
  GpsSetupRequest,
  Jeepney,
  JeepneyCreate,
  JeepneyUpdate,
  Pagination,
  RouteAssignmentTarget,
  TransitRoute,
  VehicleApplication,
} from './fleet.models';

/** Agent A fleet and vehicle-workflow endpoints. Scope and ownership are enforced server-side. */
@Injectable({ providedIn: 'root' })
export class FleetApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  /** G3 self context; broader list visibility must never imply assignment. */
  currentAssignment(): Observable<DriverAssignment | null> {
    return this.http.get<{ assignment: DriverAssignment | null }>(
      `${this.api}/me/assignment`,
    ).pipe(map((response) => response.assignment));
  }

  listGroupMembers(groupId: string, page = 1): Observable<{ members: FleetGroupMember[]; pagination: Pagination }> {
    return this.http.get<{ members: FleetGroupMember[]; pagination: Pagination }>(
      `${this.api}/fleet-groups/${encodeURIComponent(groupId)}/members`,
      { params: new HttpParams().set('page', page).set('pageSize', 100) },
    );
  }

  removeGroupMember(groupId: string, member: FleetGroupMember): Observable<void> {
    const collection = member.memberType === 'DRIVER' ? 'drivers' : 'jeepneys';
    const id = member.memberType === 'DRIVER' ? member.driverId : member.jeepneyId;
    return this.http.delete<void>(`${this.api}/fleet-groups/${encodeURIComponent(groupId)}/${collection}/${encodeURIComponent(id)}`);
  }

  unassignDriver(jeepneyId: string): Observable<DriverAssignment> {
    return this.http.delete<{ assignment: DriverAssignment }>(`${this.api}/jeepneys/${encodeURIComponent(jeepneyId)}/driver-assignment`)
      .pipe(map((response) => response.assignment));
  }

  listJeepneys(): Observable<Jeepney[]> {
    return this.http.get<{ jeepneys: Jeepney[] }>(`${this.api}/jeepneys`).pipe(map((r) => r.jeepneys));
  }

  /** G1 OPERATOR directory. Scope is derived from the bearer session; never send operatorId/associated. */
  listDrivers(query: DriverDirectoryQuery = {}): Observable<{ drivers: DriverDirectoryEntry[]; pagination: Pagination }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<{ drivers: DriverDirectoryEntry[]; pagination: Pagination }>(`${this.api}/drivers`, { params });
  }

  /** Uses the Driver business identifier from G1, never userId. The server replaces any active assignment. */
  assignDriver(jeepneyId: string, driverId: string): Observable<DriverAssignment> {
    return this.http
      .post<{ assignment: DriverAssignment }>(`${this.api}/jeepneys/${encodeURIComponent(jeepneyId)}/driver-assignment`, { driverId })
      .pipe(map((response) => response.assignment));
  }

  createJeepney(input: JeepneyCreate): Observable<Jeepney> {
    return this.http.post<{ jeepney: Jeepney }>(`${this.api}/jeepneys`, input).pipe(map((r) => r.jeepney));
  }

  updateJeepney(id: string, input: JeepneyUpdate): Observable<Jeepney> {
    return this.http
      .patch<{ jeepney: Jeepney }>(`${this.api}/jeepneys/${encodeURIComponent(id)}`, input)
      .pipe(map((r) => r.jeepney));
  }

  effectiveRoute(jeepneyId: string): Observable<EffectiveRouteDirection | null> {
    return this.http
      .get<{ effectiveRouteDirection: EffectiveRouteDirection | null }>(
        `${this.api}/jeepneys/${encodeURIComponent(jeepneyId)}/effective-route`,
      )
      .pipe(map((r) => r.effectiveRouteDirection));
  }

  listGroups(): Observable<FleetGroup[]> {
    return this.http.get<{ groups: FleetGroup[] }>(`${this.api}/fleet-groups`).pipe(map((r) => r.groups));
  }

  createGroup(input: FleetGroupCreate): Observable<FleetGroup> {
    return this.http.post<{ group: FleetGroup }>(`${this.api}/fleet-groups`, input).pipe(map((r) => r.group));
  }

  updateGroup(id: string, input: FleetGroupUpdate): Observable<FleetGroup> {
    return this.http
      .patch<{ group: FleetGroup }>(`${this.api}/fleet-groups/${encodeURIComponent(id)}`, input)
      .pipe(map((r) => r.group));
  }

  addDriverToGroup(groupId: string, driverId: string): Observable<string> {
    return this.http
      .post<{ message: string }>(`${this.api}/fleet-groups/${encodeURIComponent(groupId)}/drivers`, { driverId })
      .pipe(map((response) => response.message));
  }

  addJeepneyToGroup(groupId: string, jeepneyId: string): Observable<string> {
    return this.http
      .post<{ message: string }>(`${this.api}/fleet-groups/${encodeURIComponent(groupId)}/jeepneys`, { jeepneyId })
      .pipe(map((response) => response.message));
  }

  listApplications(): Observable<VehicleApplication[]> {
    return this.http
      .get<{ applications: VehicleApplication[] }>(`${this.api}/vehicle-applications`)
      .pipe(map((r) => r.applications));
  }

  listGpsRequests(): Observable<GpsSetupRequest[]> {
    return this.http.get<{ requests: GpsSetupRequest[] }>(`${this.api}/gps-setup-requests`).pipe(map((r) => r.requests));
  }

  /** Only an APPROVED application can be submitted (409 VEHICLE_NOT_APPROVED otherwise). */
  submitGpsRequest(vehicleApplicationId: string): Observable<GpsSetupRequest> {
    return this.http
      .post<{ request: GpsSetupRequest }>(`${this.api}/gps-setup-requests`, { vehicleApplicationId })
      .pipe(map((r) => r.request));
  }

  /** Public official routes: ACTIVE routes and directions only. */
  listRoutes(query: { q?: string; page?: number; pageSize?: number } = {}): Observable<{ routes: TransitRoute[]; pagination: Pagination }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<{ routes: TransitRoute[]; pagination: Pagination }>(`${this.api}/transit-routes`, { params });
  }

  getRoute(routeId: string): Observable<TransitRoute> {
    return this.http.get<{ route: TransitRoute }>(`${this.api}/transit-routes/${encodeURIComponent(routeId)}`).pipe(map((r) => r.route));
  }

  /** OPERATOR only; replaces the target's active assignment (there is no unassign). */
  assignRoute(routeDirectionId: string, target: RouteAssignmentTarget): Observable<unknown> {
    return this.http.post(`${this.api}/route-assignments`, { routeDirectionId, ...target });
  }

  submitApplication(jeepneyId: string, applicantNotes?: string): Observable<VehicleApplication> {
    const body = applicantNotes ? { jeepneyId, applicantNotes } : { jeepneyId };
    return this.http
      .post<{ application: VehicleApplication }>(`${this.api}/vehicle-applications`, body)
      .pipe(map((r) => r.application));
  }
}
