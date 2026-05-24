const API_BASE = "/api/v1";

// ─── Token storage ──────────────────────────────────────────────────────────
const TOKEN_KEY = "mednow.tokens";

export type Tokens = { accessToken: string; refreshToken: string };

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch ─────────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  // Try to refresh on 401
  if (response.status === 401 && tokens?.refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newTokens: Tokens = {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          };
          setTokens(newTokens);
          refreshQueue.forEach((cb) => cb(newTokens.accessToken));
          refreshQueue = [];

          // Retry original request
          const retryRes = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newTokens.accessToken}`,
              ...(options.headers as Record<string, string>),
            },
          });

          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ message: "Request failed" }));
            throw new Error(err.message || "Request failed");
          }
          return retryRes.json() as Promise<T>;
        } else {
          setTokens(null);
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      } finally {
        isRefreshing = false;
      }
    } else {
      // Queue until refresh completes
      await new Promise<void>((resolve) => {
        refreshQueue.push(() => resolve());
      });
      return apiFetch<T>(path, options);
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(err.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

// ─── Domain API types & calls ────────────────────────────────────────────────
type ApiResponse<D> = { success: boolean; message: string; data: D };
type PaginatedResponse<D> = ApiResponse<D> & { pagination: { page: number; limit: number; total: number; pages: number } };

// Auth
export const authApi = {
  login: (email: string, password: string, role?: string) =>
    api.post<ApiResponse<{ user: AuthUserRaw; accessToken: string; refreshToken: string }>>(
      "/auth/login",
      { email, password, ...(role && { role }) }
    ),
  register: (data: FormData | Record<string, unknown>) =>
    api.post<ApiResponse<{ user: AuthUserRaw; accessToken: string; refreshToken: string }>>(
      "/auth/register",
      data
    ),
  me: () => api.get<ApiResponse<{ user: AuthUserRaw }>>("/auth/me"),
  logout: () => api.post("/auth/logout"),
  updateProfile: (data: unknown) => api.put<ApiResponse<{ user: AuthUserRaw }>>("/auth/profile", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/auth/change-password", { currentPassword, newPassword }),
  getDoctors: (params?: Record<string, string>) =>
    api.get<ApiResponse<DoctorRaw[]>>(`/auth/doctors${params ? "?" + new URLSearchParams(params) : ""}`),
};

// Hospitals
export const hospitalApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<HospitalRaw[]>>(`/hospitals${params ? "?" + new URLSearchParams(params) : ""}`),
  getNearest: (lat: number, lng: number, params?: Record<string, string>) =>
    api.get<ApiResponse<{ hospitals: HospitalRaw[]; count: number }>>(
      `/hospitals/nearest?lat=${lat}&lng=${lng}${params ? "&" + new URLSearchParams(params) : ""}`
    ),
  getById: (id: string) => api.get<ApiResponse<{ hospital: HospitalRaw }>>(`/hospitals/${id}`),
  getStats: (id: string) => api.get<ApiResponse<HospitalStats>>(`/hospitals/${id}/stats`),
  updateBeds: (id: string, data: Record<string, number>) => api.patch(`/hospitals/${id}/beds`, data),
  updateOxygen: (id: string, data: Record<string, unknown>) => api.patch(`/hospitals/${id}/oxygen`, data),
};

// Appointments
export const appointmentApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AppointmentRaw[]>>(`/appointments${params ? "?" + new URLSearchParams(params) : ""}`),
  getById: (id: string) => api.get<ApiResponse<{ appointment: AppointmentRaw }>>(`/appointments/${id}`),
  book: (data: BookAppointmentInput) => api.post<ApiResponse<{ appointment: AppointmentRaw }>>("/appointments", data),
  confirm: (id: string) => api.patch(`/appointments/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.patch(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id: string, scheduledAt: string, reason?: string) =>
    api.patch(`/appointments/${id}/reschedule`, { scheduledAt, reason }),
  addPrescription: (id: string, data: unknown) => api.patch(`/appointments/${id}/prescription`, data),
  getSlots: (doctorId: string, date: string) =>
    api.get<ApiResponse<{ slots: SlotRaw[]; doctorId: string; date: string }>>(
      `/appointments/slots?doctorId=${doctorId}&date=${date}`
    ),
  submitFeedback: (id: string, rating: number, comment: string) =>
    api.post(`/appointments/${id}/feedback`, { rating, comment }),
};

// Medicines
export const medicineApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<MedicineRaw[]>>(`/medicines${params ? "?" + new URLSearchParams(params) : ""}`),
  add: (data: unknown) => api.post<ApiResponse<{ medicine: MedicineRaw }>>("/medicines", data),
  update: (id: string, data: unknown) => api.put(`/medicines/${id}`, data),
  updateStock: (id: string, quantity: number, expiryDate?: string) =>
    api.patch(`/medicines/${id}/stock`, { quantity, expiryDate }),
  delete: (id: string) => api.delete(`/medicines/${id}`),
  getLowStock: () => api.get<ApiResponse<{ medicines: MedicineRaw[] }>>("/medicines/low-stock"),
};

// Ambulance
export const ambulanceApi = {
  request: (data: AmbulanceRequestInput) => api.post<ApiResponse<{ requestId: string; nearbyHospitals: HospitalRaw[] }>>("/ambulance/request", data),
  getMyRequests: () => api.get<ApiResponse<{ requests: AmbulanceRequestRaw[] }>>("/ambulance/my"),
};

// SOS
export const sosApi = {
  trigger: (data: SOSInput) => api.post<ApiResponse<{ alertId: string; nearbyHospitals: NearbyHospital[] }>>("/sos/trigger", data),
  getMy: () => api.get<ApiResponse<{ alerts: unknown[] }>>("/sos/my"),
};

// Chatbot
export const chatbotApi = {
  sendMessage: (message: string, history: ChatHistory[], language?: string) =>
    api.post<ApiResponse<{ message: string }>>("/chatbot/message", { message, history, language }),
  analyzeSymptoms: (symptoms: string[]) =>
    api.post<ApiResponse<{ analysis: string; disclaimer: string }>>("/chatbot/analyze-symptoms", { symptoms }),
  getHealthTip: () => api.get<ApiResponse<{ tip: string }>>("/chatbot/health-tip"),
};

// Health Records
export const healthRecordApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<HealthRecordRaw[]>>(`/health-records${params ? "?" + new URLSearchParams(params) : ""}`),
  create: (data: unknown) => api.post<ApiResponse<{ record: HealthRecordRaw }>>("/health-records", data),
  delete: (id: string) => api.delete(`/health-records/${id}`),
  sync: (records: unknown[]) => api.post("/health-records/sync", { records }),
};

// Notifications
export const notificationApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ data: NotificationRaw[]; unreadCount: number; success: boolean }>(`/notifications${params ? "?" + new URLSearchParams(params) : ""}`),
  markRead: (ids?: string[]) => api.patch("/notifications/read", ids ? { ids } : {}),
  clear: () => api.delete("/notifications/clear"),
};

// ─── Raw API types (matching backend schemas) ────────────────────────────────
export interface AuthUserRaw {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "patient" | "doctor" | "hospital_admin";
  avatar?: string;
  isActive?: boolean;
  isVerified?: boolean;
  language?: string;
  patientProfile?: {
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
    emergencyContact?: { name: string; phone: string; relation: string };
    address?: { city?: string; state?: string };
  };
  doctorProfile?: {
    specialization?: string;
    licenseNumber?: string;
    hospitalId?: string;
    consultationFee?: number;
    rating?: number;
    totalRatings?: number;
    isAvailable?: boolean;
    experience?: number;
  };
  adminProfile?: {
    hospitalId?: string;
    designation?: string;
  };
}

export interface DoctorRaw {
  _id: string;
  name: string;
  avatar?: string;
  doctorProfile?: {
    specialization?: string;
    isAvailable?: boolean;
    rating?: number;
    totalRatings?: number;
    consultationFee?: number;
    hospitalId?: string;
  };
}

export interface HospitalRaw {
  _id: string;
  name: string;
  type: string;
  phone: string;
  emergencyPhone?: string;
  address: { city: string; state: string; street: string; coordinates?: { coordinates: [number, number] } };
  beds?: { total: number; available: number; icu?: number; icuAvailable?: number };
  oxygen?: { available: boolean; cylindersAvailable?: number };
  ambulances?: { total: number; available: number };
  specialties?: string[];
  rating?: number;
  distance?: number;
}

export interface HospitalStats {
  beds: { total: number; available: number; icu: number; icuAvailable: number };
  oxygen: { available: boolean; cylindersAvailable: number };
  ambulances: { total: number; available: number };
  todayAppointments: number;
  totalDoctors: number;
  lastUpdated: string;
}

export interface AppointmentRaw {
  _id: string;
  type: "in_person" | "video_call" | "voice_call" | "chat";
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rescheduled" | "no_show";
  scheduledAt: string;
  duration: number;
  symptoms?: string[];
  notes?: string;
  patient?: { _id: string; name: string; phone?: string; avatar?: string; patientProfile?: { bloodGroup?: string } };
  doctor?: { _id: string; name: string; avatar?: string; doctorProfile?: { specialization?: string; consultationFee?: number } };
  hospital?: { _id: string; name: string; address?: { city: string }; phone?: string };
  prescription?: { medicines: unknown[]; advice?: string; followUpDate?: string };
  callDetails?: { roomId?: string };
  payment?: { amount?: number; status: string };
  cancellation?: { reason?: string };
}

export interface SlotRaw {
  time: string;
  datetime: string;
  isAvailable: boolean;
}

export interface MedicineRaw {
  _id: string;
  name: string;
  genericName?: string;
  category: string;
  description?: string;
  stock: { quantity: number; unit: string; minThreshold?: number; expiryDate?: string };
  price?: { mrp?: number; hospitalPrice?: number; isSubsidized?: boolean };
  prescriptionRequired?: boolean;
  isAvailable: boolean;
  hospital?: { _id: string; name: string; address?: { city: string } };
  usage?: string;
  sideEffects?: string[];
}

export interface AmbulanceRequestRaw {
  _id: string;
  status: string;
  pickup: { address: string; coordinates: { lat: number; lng: number }; landmark?: string };
  emergency: { type: string; severity: string; description?: string };
  ambulance?: { vehicleNumber?: string; driverName?: string; driverPhone?: string; currentLocation?: { lat: number; lng: number } };
  hospital?: { name: string; phone: string };
  createdAt: string;
}

export interface AmbulanceRequestInput {
  lat: number;
  lng: number;
  address: string;
  landmark?: string;
  emergencyType?: string;
  description?: string;
  severity?: string;
  contactPhone?: string;
}

export interface SOSInput {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  emergencyType?: string;
  description?: string;
  severity?: string;
}

export interface NearbyHospital {
  id: string;
  name: string;
  phone: string;
  emergencyPhone?: string;
  distance: number;
  estimatedArrival: number;
}

export interface ChatHistory {
  role: "user" | "model";
  content: string;
}

export interface NotificationRaw {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
  priority?: string;
}

export interface HealthRecordRaw {
  _id: string;
  type: string;
  title: string;
  description?: string;
  recordDate: string;
  vitals?: Record<string, unknown>;
  diagnosis?: { primary?: string };
  prescription?: { medicines: unknown[]; advice?: string };
  labResults?: Array<{ test: string; result: string; isAbnormal?: boolean }>;
  vaccinations?: Array<{ name: string; date: string; nextDue?: string }>;
  attachments?: Array<{ name: string; url: string }>;
  isOfflineSynced?: boolean;
  createdBy?: { name: string; role: string };
  hospital?: { name: string };
}

export interface BookAppointmentInput {
  doctorId: string;
  hospitalId?: string;
  type: "in_person" | "video_call" | "voice_call" | "chat";
  scheduledAt: string;
  duration?: number;
  symptoms?: string[];
  notes?: string;
}
