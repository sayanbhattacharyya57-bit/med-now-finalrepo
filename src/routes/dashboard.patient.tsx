import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appointmentApi, notificationApi, type AppointmentRaw, type NotificationRaw } from "@/lib/api";
import { Activity, Calendar, FileText, Pill, Video, Ambulance, Bell, FolderLock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard/patient")({
  head: () => ({ meta: [{ title: "Patient dashboard — MedNow" }] }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentRaw[]>([]);
  const [notifications, setNotifications] = useState<NotificationRaw[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.role !== "patient") {
      navigate({ to: user.role === "doctor" ? "/dashboard/doctor" : "/dashboard/admin" });
      return;
    }
    loadData();
  }, [user, loading, navigate]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [apptRes, notifRes] = await Promise.allSettled([
        appointmentApi.getAll({ limit: "5", sort: "scheduledAt" }),
        notificationApi.getAll({ limit: "5" }),
      ]);
      if (apptRes.status === "fulfilled") setAppointments(apptRes.value.data || []);
      if (notifRes.status === "fulfilled") setNotifications(notifRes.value.data || []);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user) return null;

  const upcoming = appointments.filter((a) =>
    ["pending", "confirmed"].includes(a.status) && new Date(a.scheduledAt) >= new Date()
  );
  const nextAppt = upcoming[0];

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight">Hi, {user.name} 👋</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" /> Synced · offline ready
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Calendar}
            label="Next visit"
            value={nextAppt ? formatApptTime(nextAppt.scheduledAt) : "None scheduled"}
            tone="primary"
          />
          <StatCard
            icon={Pill}
            label="Upcoming appointments"
            value={String(upcoming.length)}
            tone="accent"
          />
          <StatCard
            icon={Activity}
            label="Blood group"
            value={user.patientProfile?.bloodGroup || "—"}
            tone="success"
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <QuickCard icon={Video} title="Start telemedicine" desc="Low-bandwidth audio or video with available doctors." to="/telemedicine" />
          <QuickCard icon={Pill} title="Find medicines" desc="Real-time stock at pharmacies near you." to="/pharmacy" />
          <QuickCard icon={Ambulance} title="Emergency ambulance" desc="Dispatch in seconds with location share." to="/ambulance" tone="destructive" />
          <QuickCard icon={FolderLock} title="Health records" desc="Reports & prescriptions, stored offline." to="/health-records" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/60 p-6 lg:col-span-2 glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Upcoming appointments</h3>
              <Link to="/telemedicine">
                <Button size="sm" variant="ghost" className="text-primary">Book new</Button>
              </Link>
            </div>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No upcoming appointments. Book a consultation to get started.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border/60">
                {upcoming.slice(0, 4).map((a) => (
                  <li key={a._id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.doctor?.name || "Doctor TBD"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.doctor?.doctorProfile?.specialization || "General"} · {typeLabel(a.type)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {formatApptTime(a.scheduledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl border-border/60 p-6 glass">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Notifications</h3>
              {notifications.some((n) => !n.isRead) && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
            </div>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {notifications.map((n) => (
                  <li key={n._id} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/40" : notifColor(n.priority || n.type)}`} />
                    <div>
                      <p className={`font-semibold ${!n.isRead ? "" : "opacity-60"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="mt-8 rounded-2xl border-border/60 p-6 glass">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Offline health records</h3>
            </div>
            <Link to="/health-records">
              <Button size="sm" variant="ghost" className="text-primary">View all</Button>
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Records cached on this device. Synced automatically when online.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <FolderLock className="h-4 w-4 shrink-0 text-primary" />
            <span>Encrypted and stored locally for offline access.</span>
            <Link to="/health-records" className="ml-auto shrink-0 text-xs font-semibold text-primary hover:underline">
              Open records →
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

function formatApptTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? `Today · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function typeLabel(t: AppointmentRaw["type"]) {
  return { in_person: "In-person", video_call: "Video", voice_call: "Audio", chat: "Chat" }[t] ?? t;
}

function notifColor(priority: string) {
  if (priority === "urgent" || priority === "appointment") return "bg-primary";
  if (priority === "warning" || priority === "medicine") return "bg-warning";
  return "bg-success";
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: "primary" | "accent" | "success" }) {
  const tones = { primary: "bg-primary-soft text-primary", accent: "bg-accent-soft text-accent", success: "bg-success/10 text-success" };
  return (
    <Card className="rounded-2xl border-border/60 p-5 glass">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function QuickCard({ icon: Icon, title, desc, to, tone = "primary" }: { icon: typeof Activity; title: string; desc: string; to: string; tone?: "primary" | "destructive" }) {
  const t = tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary";
  return (
    <Link to={to} className="group rounded-2xl border border-border/60 p-5 transition-shadow hover:shadow-[var(--shadow-glow)] glass">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${t}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
