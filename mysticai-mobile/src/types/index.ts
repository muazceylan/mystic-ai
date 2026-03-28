// Onboarding Types
export interface OnboardingData {
  // Auth data
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Birth info
  birthDate: Date | null;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthCountry: string;
  birthCity: string;
  birthCityManual: string;
  timezone: string;
  
  // Personal info
  gender: string;
  maritalStatus: string;
  
  // Calculated
  zodiacSign: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface City {
  name: string;
  timezone: string;
}

export interface ZodiacSign {
  name: string;
  symbol: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface GenderOption {
  id: string;
  title: string;
  emoji: string;
}

export interface MaritalStatusOption {
  id: string;
  title: string;
  emoji: string;
}

// API Types
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime?: string;
  birthCountry: string;
  birthCity: string;
  timezone: string;
  gender: string;
  maritalStatus?: string;
  zodiacSign: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthTime?: string;
  birthCountry: string;
  birthCity: string;
  gender: string;
  zodiacSign: string;
  createdAt: string;
}

export * from './match';
export * from './compare';
