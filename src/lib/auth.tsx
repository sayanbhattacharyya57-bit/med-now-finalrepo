import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, setTokens, getTokens, type AuthUserRaw } from "./api";
import { reconnectSocket, disconnectSocket } from "./socket";

export type Role = "patient" | "doctor" | "hospital_admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatar?: string;
  isVerified?: boolean;
  language?: string;
  patientProfile?: AuthUserRaw["patientProfile"];
  doctorProfile?: AuthUserRaw["doctorProfile"];
  adminProfile?: AuthUserRaw["adminProfile"];
};

function rawToUser(raw: AuthUserRaw): AuthUser {
  return {
    id: raw._id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    avatar: raw.avatar,
    isVerified: raw.isVerified,
    language: raw.language,
    patientProfile: raw.patientProfile,
    doctorProfile: raw.doctorProfile,
    adminProfile: raw.adminProfile,
  };
}

export type RegisterPatientData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "patient";
  language?: string;
};

export type RegisterDoctorData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "doctor";
  specialization: string;
  licenseNumber: string;
  experience?: number;
  degreeFile?: File;
};

export type RegisterAdminData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "hospital_admin";
  hospitalName: string;
  hospitalLocation: string;
  hospitalSpecialization: string;
  hasAmbulance: boolean;
  hasEmergency: boolean;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<AuthUser>;
  registerPatient: (data: RegisterPatientData) => Promise<AuthUser>;
  registerDoctor: (data: RegisterDoctorData) => Promise<AuthUser>;
  registerAdmin: (data: RegisterAdminData) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => ({}) as AuthUser,
  registerPatient: async () => ({}) as AuthUser,
  registerDoctor: async () => ({}) as AuthUser,
  registerAdmin: async () => ({}) as AuthUser,
  logout: () => {},
  refreshUser: async () => {},
});

const USER_KEY = "mednow.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  };

  // Hydrate from localStorage then verify with server
  useEffect(() => {
    const init = async () => {
      try {
        const cached = localStorage.getItem(USER_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        }

        const tokens = getTokens();
        if (tokens) {
          const res = await authApi.me();
          const u = rawToUser(res.data.user);
          persist(u);
          reconnectSocket(tokens.accessToken);
        } else {
          persist(null);
        }
      } catch {
        // Token invalid — clear everything
        setTokens(null);
        persist(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,

      login: async (email, password, role) => {
        const res = await authApi.login(email, password, role);
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        const u = rawToUser(res.data.user);
        persist(u);
        reconnectSocket(res.data.accessToken);
        return u;
      },

      registerPatient: async (data) => {
        const res = await authApi.register(data);
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        const u = rawToUser(res.data.user);
        persist(u);
        reconnectSocket(res.data.accessToken);
        return u;
      },

      registerDoctor: async (data) => {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("password", data.password);
        formData.append("role", "doctor");
        formData.append("specialization", data.specialization);
        formData.append("licenseNumber", data.licenseNumber);
        if (data.experience) formData.append("experience", String(data.experience));
        if (data.degreeFile) formData.append("degreeFile", data.degreeFile);

        // Send as JSON since file upload isn't persisted yet
        const res = await authApi.register({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: "doctor",
          doctorProfile: {
            specialization: data.specialization,
            licenseNumber: data.licenseNumber,
            experience: data.experience,
          },
        });
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        const u = rawToUser(res.data.user);
        persist(u);
        reconnectSocket(res.data.accessToken);
        return u;
      },

      registerAdmin: async (data) => {
        const res = await authApi.register({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: "hospital_admin",
          hospitalInfo: {
            name: data.hospitalName,
            location: data.hospitalLocation,
            specialization: data.hospitalSpecialization,
            hasAmbulance: data.hasAmbulance,
            hasEmergency: data.hasEmergency,
          },
        });
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        const u = rawToUser(res.data.user);
        persist(u);
        reconnectSocket(res.data.accessToken);
        return u;
      },

      logout: () => {
        authApi.logout().catch(() => {});
        setTokens(null);
        persist(null);
        disconnectSocket();
      },

      refreshUser: async () => {
        try {
          const res = await authApi.me();
          persist(rawToUser(res.data.user));
        } catch {}
      },
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
