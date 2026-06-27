import { Role } from './enums.model';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isSuperAdmin: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  subscriptionId?: string;
  subscriptionPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  isSuperAdmin?: boolean;
  exp: number;
}
