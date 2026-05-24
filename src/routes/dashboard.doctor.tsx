import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appointmentApi, type AppointmentRaw } from "@/lib/api";
import { Activity, Calendar, ShieldCheck, Video, Users, Stethoscope, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard/doctor")({
  head: () => ({ meta: [{ title: "Doctor dashboard — MedNow" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentRaw[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.role !== "doctor") {
      navigate({ to: user.role === "patient" ? "/dashboard/patient" : "/dashboard/admin" });
      return;
    }
    loadData();
  }, [user, loading, navigate]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const res = await appointmentApi.getAll({ limit: "20", sort: "scheduledAt" });
      setAppointments(res.data || []);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setDataLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      await appointmentApi.confirm(id);
      toast.success("Appointment confirmed");
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: "confirmed" } : a));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await appointmentApi.cancel(id, "Cancelled by doctor");
      toast.success("Appointment cancelled");
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: "cancelled" } : a));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !user) return null;

  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    const today = new Date();
    return d.toDateString() === today.toDateString() && a.status !== "cancelled";
  });

  const pendingAppts = appointments.filter((a) => a.status === "pending");
  const liveAppts = appointments.filter((a) => a.status === "in_progress");
  const weekAppts = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    return d >= now && d <= weekEnd;
  });

  const avgRating = user.doctorProfile?.rating;

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {user.doctorProfile?.specialization || "Physician"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Dr. {user.name}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified physician
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat icon={Users} label="Patients today" value={String(todayAppts.length)} />
          <Stat icon={Video} label="Live consults" value={String(liveAppts.length)} />
          <Stat icon={Calendar} label="This week" value={String(weekAppts.length)} />
          <Stat icon={Activity} label="Avg rating" value={avgRating ? `${avgRating.toFixed(1)} ★` : "—"} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/60 p-6 lg:col-span-2 glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Today's schedule</h3>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => toast.info("Live session will launch telemedicine call")}
              >
                Go live
              </Button>
            </div>

            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : todayAppts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No appointments scheduled for today.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border/60">
                {todayAppts.map((a) => {
                  const time = new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isUrgent = a.type === "voice_call" && a.status === "pending";
                  return (
                    <li key={a._id} className="flex items-center gap-3 py-3">
                      <div className="w-14 shrink-0 text-sm font-semibold">{time}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.patient?.name || "Patient"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.symptoms?.join(", ") || "General"} · {typeLabel(a.type)}
                        </p>
                      </div>
                      {isUrgent ? (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Urgent</span>
                      ) : a.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-7 px-2 text-xs"
                            disabled={actionLoading === a._id}
                            onClick={() => handleConfirm(a._id)}
                          >
                            {actionLoading === a._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-7 px-2 text-xs text-destructive border-destructive/30"
                            disabled={actionLoading === a._id}
                            onClick={() => handleCancel(a._id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(a.status)}`}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl border-border/60 p-6 glass">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Pending requests</h3>
              {pendingAppts.length > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
                  {pendingAppts.length}
                </span>
              )}
            </div>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : pendingAppts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {pendingAppts.slice(0, 5).map((a) => {
                  const d = new Date(a.scheduledAt);
                  const waitMins = Math.round((Date.now() - new Date(a.scheduledAt).getTime()) / 60000);
                  const isOverdue = d < new Date();
                  return (
                    <li key={a._id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${isOverdue ? "bg-destructive" : "bg-warning"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.patient?.name || "Patient"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.symptoms?.[0] || typeLabel(a.type)} · {isOverdue ? `${Math.abs(waitMins)}m ago` : formatFuture(d)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Consultation fee: ₹{user.doctorProfile?.consultationFee ?? "—"}</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

function typeLabel(t: AppointmentRaw["type"]) {
  return { in_person: "In-person", video_call: "Video", voice_call: "Audio (2G)", chat: "Chat" }[t] ?? t;
}

function statusBadge(status: string) {
  if (status === "confirmed") return "bg-success/10 text-success";
  if (status === "in_progress") return "bg-primary/10 text-primary";
  if (status === "completed") return "bg-muted text-muted-foreground";
  return "bg-border/60 text-foreground";
}

function formatFuture(d: Date) {
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins < 60) return `in ${mins}m`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-5 glass">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
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
