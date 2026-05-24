import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hospitalApi, medicineApi, appointmentApi, type HospitalRaw, type MedicineRaw, type AppointmentRaw } from "@/lib/api";
import {
  Building2, Bed, Droplets, Ambulance as AmbulanceIcon, Pill, Users, ShieldCheck, Loader2,
  TrendingUp, AlertTriangle, Edit2, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({ meta: [{ title: "Hospital admin — MedNow" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<HospitalRaw | null>(null);
  const [medicines, setMedicines] = useState<MedicineRaw[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRaw[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editBeds, setEditBeds] = useState(false);
  const [bedsAvail, setBedsAvail] = useState("");
  const [oxygenAvail, setOxygenAvail] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.role !== "hospital_admin") {
      navigate({ to: user.role === "patient" ? "/dashboard/patient" : "/dashboard/doctor" });
      return;
    }
    loadData();
  }, [user, loading, navigate]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const hospitalId = user?.adminProfile?.hospitalId;
      const [hospRes, medRes, apptRes] = await Promise.allSettled([
        hospitalId ? hospitalApi.getById(hospitalId) : hospitalApi.getAll({ limit: "1" }),
        medicineApi.getAll({ limit: "10" }),
        appointmentApi.getAll({ limit: "10", sort: "-scheduledAt" }),
      ]);

      if (hospRes.status === "fulfilled") {
        const h = "hospital" in hospRes.value.data
          ? (hospRes.value.data as { hospital: HospitalRaw }).hospital
          : (hospRes.value.data as HospitalRaw[])[0];
        if (h) {
          setHospital(h);
          setBedsAvail(String(h.beds?.available ?? 0));
          setOxygenAvail(String(h.oxygen?.cylindersAvailable ?? 0));
        }
      }
      if (medRes.status === "fulfilled") setMedicines(medRes.value.data || []);
      if (apptRes.status === "fulfilled") setAppointments(apptRes.value.data || []);
    } catch {
      toast.error("Failed to load hospital data");
    } finally {
      setDataLoading(false);
    }
  };

  const saveBeds = async () => {
    if (!hospital) return;
    setSaving("beds");
    try {
      await hospitalApi.updateBeds(hospital._id, { available: parseInt(bedsAvail) });
      setHospital((h) => h ? { ...h, beds: { ...h.beds!, available: parseInt(bedsAvail) } } : h);
      setEditBeds(false);
      toast.success("Bed count updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update beds");
    } finally {
      setSaving(null);
    }
  };

  const saveOxygen = async () => {
    if (!hospital) return;
    setSaving("oxygen");
    try {
      await hospitalApi.updateOxygen(hospital._id, { cylindersAvailable: parseInt(oxygenAvail) });
      setHospital((h) => h ? { ...h, oxygen: { ...h.oxygen!, cylindersAvailable: parseInt(oxygenAvail) } } : h);
      toast.success("Oxygen updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update oxygen");
    } finally {
      setSaving(null);
    }
  };

  if (loading || !user) return null;

  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return d.toDateString() === new Date().toDateString();
  });
  const lowStockMeds = medicines.filter((m) => m.stock.quantity <= (m.stock.minThreshold ?? 10));

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Hospital administrator</p>
            <h1 className="text-3xl font-bold tracking-tight">{hospital?.name ?? "Your Hospital"}</h1>
            {hospital?.address && (
              <p className="mt-0.5 text-sm text-muted-foreground">{hospital.address.city}, {hospital.address.state}</p>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin verified
          </div>
        </div>

        {dataLoading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Bed} label="Beds available" value={`${hospital?.beds?.available ?? "—"} / ${hospital?.beds?.total ?? "—"}`} tone="primary" />
              <StatCard icon={Droplets} label="Oxygen cylinders" value={String(hospital?.oxygen?.cylindersAvailable ?? "—")} tone="success" />
              <StatCard icon={AmbulanceIcon} label="Ambulances ready" value={`${hospital?.ambulances?.available ?? "—"} / ${hospital?.ambulances?.total ?? "—"}`} tone="accent" />
              <StatCard icon={TrendingUp} label="Today appointments" value={String(todayAppts.length)} tone="primary" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Bed & Oxygen management */}
              <Card className="rounded-2xl border-border/60 p-6 glass">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Building2 className="h-4 w-4 text-primary" /> Resource management
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setEditBeds((e) => !e)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Available beds</Label>
                      {editBeds ? (
                        <div className="mt-1 flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={hospital?.beds?.total ?? 999}
                            value={bedsAvail}
                            onChange={(e) => setBedsAvail(e.target.value)}
                            className="h-8 rounded-lg"
                          />
                          <Button size="sm" onClick={saveBeds} disabled={saving === "beds"} className="h-8 rounded-lg px-2">
                            {saving === "beds" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditBeds(false)} className="h-8 rounded-lg px-2">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-1 text-2xl font-bold">{hospital?.beds?.available ?? "—"}</p>
                      )}
                    </div>
                    <div className="h-12 w-px bg-border/40" />
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">ICU beds available</Label>
                      <p className="mt-1 text-2xl font-bold">{hospital?.beds?.icuAvailable ?? "—"}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4">
                    <Label className="text-xs text-muted-foreground">Oxygen cylinders</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={oxygenAvail}
                        onChange={(e) => setOxygenAvail(e.target.value)}
                        className="h-8 w-28 rounded-lg"
                      />
                      <Button size="sm" onClick={saveOxygen} disabled={saving === "oxygen"} variant="outline" className="h-8 rounded-lg">
                        {saving === "oxygen" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Medicine stock alerts */}
              <Card className="rounded-2xl border-border/60 p-6 glass">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Pill className="h-4 w-4 text-primary" /> Medicine stock
                  </h3>
                  {lowStockMeds.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                      <AlertTriangle className="h-3 w-3" /> {lowStockMeds.length} low
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {medicines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No medicines added yet.</p>
                  ) : (
                    medicines.slice(0, 6).map((m) => {
                      const low = m.stock.quantity <= (m.stock.minThreshold ?? 10);
                      const out = m.stock.quantity === 0;
                      return (
                        <div key={m._id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3">
                          <div className={`h-2 w-2 rounded-full ${out ? "bg-destructive" : low ? "bg-warning" : "bg-success"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.category}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${out ? "bg-destructive/10 text-destructive" : low ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success"}`}>
                            {m.stock.quantity} {m.stock.unit}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Today's appointments */}
            <Card className="mt-6 rounded-2xl border-border/60 p-6 glass">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-primary" /> Today's appointments
                </h3>
                <span className="text-xs text-muted-foreground">{todayAppts.length} total</span>
              </div>
              {todayAppts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No appointments today.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {todayAppts.slice(0, 6).map((a) => (
                    <div key={a._id} className="rounded-xl border border-border/40 bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{a.patient?.name || "Patient"}</p>
                          <p className="text-xs text-muted-foreground">{a.doctor?.name || "Doctor"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {typeLabel(a.type)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

function typeLabel(t: AppointmentRaw["type"]) {
  return { in_person: "In-person", video_call: "Video", voice_call: "Audio", chat: "Chat" }[t] ?? t;
}

function statusBadge(status: string) {
  if (status === "confirmed") return "bg-success/10 text-success";
  if (status === "in_progress") return "bg-primary/10 text-primary";
  if (status === "pending") return "bg-warning/15 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Bed; label: string; value: string; tone: "primary" | "accent" | "success" }) {
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
