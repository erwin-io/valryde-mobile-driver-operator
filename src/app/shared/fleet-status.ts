import type { ApplicationStatus, GpsSetupStatus, GpsVerificationStatus, JeepneyStatus, RecordStatus } from '../core/fleet.models';
import type { StatusTone } from './status-pill.component';

type AnyStatus = JeepneyStatus | RecordStatus | ApplicationStatus | GpsSetupStatus | GpsVerificationStatus;

// Labels and tones for server-provided states. Display only: nothing here can change a state.
const LABELS: Record<AnyStatus, [string, StatusTone]> = {
  DRAFT: ['Draft', 'unknown'],
  PENDING_APPROVAL: ['Pending approval', 'warning'],
  PENDING: ['Pending', 'warning'],
  APPROVED: ['Approved', 'info'],
  ACTIVE: ['Active', 'success'],
  INACTIVE: ['Inactive', 'unknown'],
  REJECTED: ['Rejected', 'danger'],
  SCHEDULED: ['Installation scheduled', 'info'],
  INSTALLED: ['Installed — awaiting verification', 'info'],
  NOT_STARTED: ['Not started', 'unknown'],
  VERIFIED: ['Verified', 'success'],
  FAILED: ['Verification failed', 'danger'],
};

export const statusLabel = (status: AnyStatus) => LABELS[status]?.[0] ?? status;
export const statusTone = (status: AnyStatus): StatusTone => LABELS[status]?.[1] ?? 'unknown';
