export type ValrydeRole = 'COMMUTER' | 'DRIVER' | 'OPERATOR' | 'ADMIN';
export type MobileRole = Extract<ValrydeRole, 'DRIVER' | 'OPERATOR'>;

export interface ValrydeUser {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'DISABLED';
  emailVerified: boolean;
  roles: ValrydeRole[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: string;
  user: ValrydeUser;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  displayName: string;
  role: MobileRole;
}
