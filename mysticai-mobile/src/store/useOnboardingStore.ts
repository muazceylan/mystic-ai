import { create } from 'zustand';

export interface OnboardingData {
  // Auth data
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Birth info
  birthDate: Date | null;
  birthTime: string; // HH:mm format
  birthTimeUnknown: boolean;
  birthCountry: string;
  birthCity: string;
  birthCityManual: string;
  timezone: string;
  
  // Personal info
  gender: string;
  maritalStatus: string;
  
  // Intentions
  focusPoint: string;
  
  // Calculated
  zodiacSign: string;
}

interface OnboardingStore extends OnboardingData {
  // Actions
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  
  setBirthDate: (date: Date | null) => void;
  setBirthTime: (time: string) => void;
  setBirthTimeUnknown: (unknown: boolean) => void;
  setBirthCountry: (country: string) => void;
  setBirthCity: (city: string) => void;
  setBirthCityManual: (city: string) => void;
  setTimezone: (timezone: string) => void;
  
  setGender: (gender: string) => void;
  setMaritalStatus: (status: string) => void;
  setFocusPoint: (focus: string) => void;
  setZodiacSign: (sign: string) => void;
  
  // Validation
  isEmailValid: () => boolean;
  isPasswordValid: () => boolean;
  isFormValid: () => boolean;
  
  // Data export
  getRegisterData: () => Partial<OnboardingData>;
  
  // Reset
  reset: () => void;
}

const initialState: OnboardingData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  
  birthDate: null,
  birthTime: '12:00',
  birthTimeUnknown: false,
  birthCountry: '',
  birthCity: '',
  birthCityManual: '',
  timezone: 'Europe/Istanbul',
  
  gender: '',
  maritalStatus: '',
  focusPoint: '',
  zodiacSign: '',
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...initialState,

  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  
  setBirthDate: (birthDate) => set({ birthDate }),
  setBirthTime: (birthTime) => set({ birthTime }),
  setBirthTimeUnknown: (birthTimeUnknown) => set({ birthTimeUnknown }),
  setBirthCountry: (birthCountry) => set({ birthCountry }),
  setBirthCity: (birthCity) => set({ birthCity }),
  setBirthCityManual: (birthCityManual) => set({ birthCityManual }),
  setTimezone: (timezone) => set({ timezone }),
  
  setGender: (gender) => set({ gender }),
  setMaritalStatus: (maritalStatus) => set({ maritalStatus }),
  setFocusPoint: (focusPoint) => set({ focusPoint }),
  setZodiacSign: (zodiacSign) => set({ zodiacSign }),
  
  isEmailValid: () => {
    const { email } = get();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  isPasswordValid: () => {
    const { password } = get();
    return password.length >= 8;
  },
  
  isFormValid: () => {
    const state = get();
    return (
      state.firstName.length > 0 &&
      state.lastName.length > 0 &&
      state.isEmailValid() &&
      state.isPasswordValid() &&
      state.password === state.confirmPassword &&
      state.birthDate !== null &&
      state.birthCountry.length > 0 &&
      (state.birthCity.length > 0 || state.birthCityManual.length > 0) &&
      state.gender.length > 0 &&
      state.focusPoint.length > 0
    );
  },
  
  getRegisterData: () => {
    const state = get();
    return {
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      birthDate: state.birthDate,
      birthTime: state.birthTimeUnknown ? null : state.birthTime,
      birthTimeUnknown: state.birthTimeUnknown,
      birthCountry: state.birthCountry,
      birthCity: state.birthCity || state.birthCityManual,
      timezone: state.timezone,
      gender: state.gender,
      maritalStatus: state.maritalStatus,
      focusPoint: state.focusPoint,
      zodiacSign: state.zodiacSign,
    };
  },
  
  reset: () => set(initialState),
}));
