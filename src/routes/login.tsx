import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/lib/auth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Heart, ShieldCheck, Stethoscope, User, Building2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MedNow" },
      { name: "description", content: "Patient, doctor and hospital admin login for MedNow." },
    ],
  }),
  component: LoginPage,
});

const ROLES: { id: Role; label: string; icon: typeof User }[] = [
  { id: "patient", label: "Patient", icon: User },
  { id: "doctor", label: "Doctor", icon: Stethoscope },
  { id: "hospital_admin", label: "Hospital", icon: Building2 },
];

function LoginPage() {
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const dashboardFor = (r: Role) =>
    r === "doctor" ? "/dashboard/doctor" : r === "hospital_admin" ? "/dashboard/admin" : "/dashboard/patient";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password, role);
      toast.success(`Welcome back, ${u.name}`);
      navigate({ to: dashboardFor(u.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-80" />
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-14">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Heart className="h-7 w-7" fill="currentColor" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to MedNow</p>

        <div className="mt-7 w-full rounded-3xl p-6 shadow-[var(--shadow-glow)] glass">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-1">
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRole(id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${role === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {role === "doctor" && (
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs text-primary">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Doctor accounts require hospital admin approval. Pending accounts can log in but have limited access.
              </div>
            )}
            {role === "hospital_admin" && (
              <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Hospital admins manage medicines, beds, oxygen levels, and doctor approvals.
              </div>
            )}

            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to MedNow?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
