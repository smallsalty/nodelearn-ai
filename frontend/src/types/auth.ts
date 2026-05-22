import type { UserRole, UserStatus } from "./contracts";

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}
