export type AppLocale = 'en-US' | 'en-GB' | 'en-IE';
export type UserRole = 'user' | 'account_manager' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  locale: AppLocale;
  role: UserRole;
  managedUserIds?: string[];  // account_manager only
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  country: string;
}
