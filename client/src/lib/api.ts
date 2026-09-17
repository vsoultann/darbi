import type { TrackPayload } from '@shared/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('offline', 0, 'offline');
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const code = (data as { error?: string } | null)?.error;
    throw new ApiError(code ?? response.statusText, response.status, code);
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),
  lookup: (name: string, studentNo: string) =>
    request<{ ok: boolean; studentNo: string }>('/api/students/lookup', {
      method: 'POST',
      body: JSON.stringify({ name, studentNo }),
    }),
  track: (studentNo: string) => request<TrackPayload>(`/api/students/${encodeURIComponent(studentNo)}`),
  demoStudents: () =>
    request<{ students: Array<{ student_no: string; name_en: string; name_ar: string; grade: string }> }>(
      '/api/students/demo',
    ),
  routes: () => request<{ school: unknown; routes: unknown[]; buses: unknown[] }>('/api/routes'),
  adminLogin: (pin: string) =>
    request<{ token: string; role: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  adminOverview: (token: string) =>
    request<AdminOverview>('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
  driverLogin: (pin: string) =>
    request<{ token: string; role: string }>('/api/driver/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  driverBuses: (token: string) =>
    request<DriverBuses>('/api/driver/buses', { headers: { Authorization: `Bearer ${token}` } }),
  driverAction: (token: string, busId: string, action: string, body: Record<string, unknown> = {}) =>
    request<{ ok: boolean }>(`/api/driver/buses/${busId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
};

export interface AdminOverviewBus {
  bus: { id: string; plate: string; route_id: string; capacity: number };
  driver: { name_en: string; name_ar: string; phone: string } | null;
  route: { id: string; name_en: string; name_ar: string } | null;
  students: number;
  update: import('@shared/types').TripUpdate | null;
  scenario: string | null;
}

export interface AdminOverview {
  school: { name_en: string; name_ar: string } | null;
  buses: AdminOverviewBus[];
  sessions: number;
  students: number;
}

export interface DriverBuses {
  buses: Array<{
    bus: { id: string; plate: string; route_id: string };
    driver: { name_en: string; name_ar: string; phone: string } | null;
    route: { id: string; name_en: string; name_ar: string } | null;
    stops: import('@shared/types').Stop[];
    students: number;
    update: import('@shared/types').TripUpdate | null;
  }>;
}
