// Agent A fleet / workflow / transit DTOs (OpenAPI audit, origin/main 827738c). Display-only: the server owns every status.
export type JeepneyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
export type RecordStatus = 'ACTIVE' | 'INACTIVE';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GpsSetupStatus = 'PENDING' | 'APPROVED' | 'SCHEDULED' | 'INSTALLED' | 'REJECTED';
export type GpsVerificationStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED';

export interface Jeepney {
  id: string;
  operatorId: string | null;
  plateNo: string;
  colorHex: string;
  description: string | null;
  status: JeepneyStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Create fields an Operator may send; owner and status are always server-derived. */
export interface JeepneyCreate {
  plateNo: string;
  colorHex: string;
  description?: string;
}

/** Update fields an Operator may send; the plate is immutable and status is Admin-only. */
export interface JeepneyUpdate {
  colorHex?: string;
  description?: string | null;
}

export interface FleetGroup {
  id: string;
  operatorId: string;
  name: string;
  description: string | null;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FleetGroupCreate {
  name: string;
  description?: string;
}

export interface FleetGroupUpdate {
  name?: string;
  description?: string | null;
  status?: RecordStatus;
}

export interface VehicleApplication {
  id: string;
  jeepneyId: string;
  submittedByUserId: string;
  status: ApplicationStatus;
  applicantNotes: string | null;
  reviewNotes: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteDirection {
  id: string;
  routeId: string;
  directionLabel: string;
  originName: string;
  destinationName: string;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  corridorM: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveRouteDirection {
  source: 'DIRECT' | 'GROUP';
  assignmentId: string;
  groupId: string | null;
  activeFrom: string;
  direction: RouteDirection;
}

export interface GpsSetupRequest {
  id: string;
  vehicleApplicationId: string;
  jeepneyId: string;
  requestedByUserId: string;
  status: GpsSetupStatus;
  verificationStatus: GpsVerificationStatus;
  scheduledAt: string | null;
  installedAt: string | null;
  rejectedReason: string | null;
  verificationChecks: Record<string, unknown>;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransitRoute {
  id: string;
  routeCode: string;
  publicName: string;
  description: string | null;
  routeColorHex: string;
  status: RouteDirection['status'];
  createdAt: string;
  updatedAt: string;
  directions: RouteDirection[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Exactly one target; the server rejects both or neither (400). */
export type RouteAssignmentTarget = { jeepneyId: string } | { groupId: string };
