import api from './api';

export interface NumerologyResponse {
  name: string;
  birthDate: string;
  lifePathNumber: number;
  destinyNumber: number;
  soulUrgeNumber: number;
  summary: string;
}

const NUMEROLOGY_BASE = '/api/numerology';

export const fetchNumerology = async (params: {
  name: string;
  birthDate: string;
}): Promise<NumerologyResponse> => {
  const query = new URLSearchParams({
    name: params.name,
    birthDate: params.birthDate,
  }).toString();
  const res = await api.get<NumerologyResponse>(
    `${NUMEROLOGY_BASE}/calculate?${query}`
  );
  return res.data;
};
