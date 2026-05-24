import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/lib/auth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Stethoscope, User, Heart, Building2, Upload, CheckSquare, Square } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — MedNow" },
      { name: "description", content: "Register as a patient, doctor, or hospital admin on MedNow." },
    ],
  }),
  component: RegisterPage,
});

const ROLES: { id: Role; label: string; icon: typeof User; desc: string }[] = [
  { id: "patient", label: "Patient", icon: User, desc: "Book appointments & track health" },
  { id: "doctor", label: "Doctor", icon: Stethoscope, desc: "Consult patients via telemedicine" },
  { id: "hospital_admin", label: "Hospital", icon: Building2, desc: "Manage hospital resources" },
];

function RegisterPage() {
  const [role, setRole] = useState<Role>("patient");
  const [loading, setLoading] = useState(false);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [hasAmbulance, setHasAmbulance] = useState(false);
  const [hasEmergency, setHasEmergency] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialization: "",
    licenseNumber: "",
    experience: "",
    hospitalName: "",
    hospitalLocation: "",
    hospitalSpecialization: "",
  });

  const { registerPatient, registerDoctor, registerAdmin } = useAuth();
  const navigate = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const dashboardFor = (r: Role) =>
    r === "doctor" ? "/dashboard/doctor" : r === "hospital_admin" ? "/dashboard/admin" : "/dashboard/patient";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      let u;
      if (role === "patient") {
        u = await registerPatient({
          name: form.name, email: form.email, phone: form.phone,
          password: form.password, role: "patient",
        });
        toast.success(`Welcome to MedNow, ${u.name}!`);
      } else if (role === "doctor") {
        if (!form.specialization || !form.licenseNumber) {
          toast.error("Specialization and license number are required for doctors");
          setLoading(false);
          return;
        }
        u = await registerDoctor({
          name: form.name, email: form.email, phone: form.phone,
          password: form.password, role: "doctor",
          specialization: form.specialization,
          licenseNumber: form.licenseNumber,
          experience: form.experience ? parseInt(form.experience) : undefined,
          degreeFile: degreeFile ?? undefined,
        });
        toast.success("Account submitted for hospital verification. You can log in now.");
      } else {
        if (!form.hospitalName || !form.hospitalLocation) {
          toast.error("Hospital name and location are required");
          setLoading(false);
          return;
        }
        u = await registerAdmin({
          name: form.name, email: form.email, phone: form.phone,
          password: form.password, role: "hospital_admin",
          hospitalName: form.hospitalName,
          hospitalLocation: form.hospitalLocation,
          hospitalSpecialization: form.hospitalSpecialization,
          hasAmbulance,
          hasEmergency,
        });
        toast.success(`Hospital admin account created, ${u.name}!`);
      }
      navigate({ to: dashboardFor(u.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-80" />
      <Navbar />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-14">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Heart className="h-7 w-7" fill="currentColor" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quality healthcare, everywhere</p>

        <div className="mt-7 w-full rounded-3xl p-6 shadow-[var(--shadow-glow)] glass">
          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-colors ${role === id ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
                <span className="font-normal text-[10px] leading-tight text-center opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" required value={form.name} onChange={set("name")} placeholder="Priya Kumar" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" required value={form.phone} onChange={set("phone")} placeholder="9876543210" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password * (min 8 chars)</Label>
              <Input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="••••••••" autoComplete="new-password" />
            </div>

            {/* Doctor fields */}
            {role === "doctor" && (
              <div className="space-y-4 rounded-xl border border-border/60 p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Doctor credentials</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="spec">Specialization *</Label>
                    <Input id="spec" required value={form.specialization} onChange={set("specialization")} placeholder="General Medicine" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Experience (years)</Label>
                    <Input id="exp" type="number" min="0" value={form.experience} onChange={set("experience")} placeholder="5" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="license">Medical license number *</Label>
                  <Input id="license" required value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="MCI-XXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="degree">Degree certificate (JPG/PNG)</Label>
                  <label
                    htmlFor="degree"
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    {degreeFile ? degreeFile.name : "Click to upload degree certificate"}
                    <input
                      id="degree"
                      type="file"
                      className="sr-only"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => setDegreeFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs text-primary">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" />
                  Your account will be pending until approved by a hospital admin.
                </div>
              </div>
            )}

            {/* Hospital admin fields */}
            {role === "hospital_admin" && (
              <div className="space-y-4 rounded-xl border border-border/60 p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Hospital information</p>
                <div className="space-y-1.5">
                  <Label htmlFor="hname">Hospital name *</Label>
                  <Input id="hname" required value={form.hospitalName} onChange={set("hospitalName")} placeholder="AIIMS Patna" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hloc">Hospital location *</Label>
                  <Input id="hloc" required value={form.hospitalLocation} onChange={set("hospitalLocation")} placeholder="Phulwari, Patna, Bihar" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hspec">Specialization</Label>
                  <Input id="hspec" value={form.hospitalSpecialization} onChange={set("hospitalSpecialization")} placeholder="Multi-specialty, Cardiology…" />
                </div>
                <div className="space-y-2">
                  <Label>Facilities available</Label>
                  <button
                    type="button"
                    onClick={() => setHasAmbulance((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 transition-colors"
                  >
                    {hasAmbulance ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    Ambulance service available
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasEmergency((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 transition-colors"
                  >
                    {hasEmergency ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    24/7 emergency support
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={loading}>
              {loading
                ? "Creating account…"
                : role === "doctor"
                ? "Submit for verification"
                : role === "hospital_admin"
                ? "Create hospital account"
                : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already on MedNow?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
