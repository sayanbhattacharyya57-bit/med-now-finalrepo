import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { healthRecordApi, type HealthRecordRaw } from "@/lib/api";
import {
  FileText, FolderLock, Plus, Search, Loader2, Heart, Syringe, FlaskConical,
  Pill, X, Download, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/health-records")({
  head: () => ({ meta: [{ title: "Health records — MedNow" }] }),
  component: HealthRecordsPage,
});

const OFFLINE_KEY = "mednow.health_records_offline";

type NewRecord = { type: string; title: string; description: string; recordDate: string };

function HealthRecordsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<HealthRecordRaw[]>([]);
  const [offlineRecords, setOfflineRecords] = useState<HealthRecordRaw[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [newRec, setNewRec] = useState<NewRecord>({
    type: "lab_report", title: "", description: "", recordDate: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }

    // Load offline records
    try {
      const raw = localStorage.getItem(OFFLINE_KEY);
      if (raw) setOfflineRecords(JSON.parse(raw));
    } catch {}

    loadRecords();
  }, [user, loading, navigate]);

  const loadRecords = async () => {
    setDataLoading(true);
    try {
      const res = await healthRecordApi.getAll({ limit: "50", sort: "-recordDate" });
      const fetched = res.data || [];
      setRecords(fetched);
      // Cache for offline
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(fetched));
    } catch {
      // Fallback to offline cache
      try {
        const raw = localStorage.getItem(OFFLINE_KEY);
        if (raw) setOfflineRecords(JSON.parse(raw));
      } catch {}
    } finally {
      setDataLoading(false);
    }
  };

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRec.title) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const res = await healthRecordApi.create({
        type: newRec.type,
        title: newRec.title,
        description: newRec.description,
        recordDate: new Date(newRec.recordDate).toISOString(),
      });
      const added = res.data.record;
      setRecords((prev) => [added, ...prev]);
      setAddOpen(false);
      setNewRec({ type: "lab_report", title: "", description: "", recordDate: new Date().toISOString().split("T")[0] });
      toast.success("Health record added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add record");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await healthRecordApi.delete(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      toast.success("Record deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading || !user) return null;

  const displayRecords = records.length > 0 ? records : offlineRecords;
  const filtered = displayRecords.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || r.type.toLowerCase().includes(q.toLowerCase())
  );

  const byType = Object.entries(
    filtered.reduce<Record<string, HealthRecordRaw[]>>((acc, r) => {
      const k = r.type;
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
      return acc;
    }, {})
  );

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Health records</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Your medical history</h1>
            <p className="mt-1 text-muted-foreground">Encrypted and cached offline for access anywhere.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                <WifiOff className="h-3 w-3" /> Offline mode
              </span>
            )}
            <Button className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add record
            </Button>
          </div>
        </div>

        <Card className="mt-6 rounded-2xl border-border/60 p-4 glass">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, type…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
        </Card>

        {dataLoading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FolderLock className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold">{q ? "No records found" : "No health records yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q ? "Try different search terms." : "Add your first health record to get started."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {byType.map(([type, recs]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  {typeIcon(type)}
                  <h2 className="text-base font-semibold capitalize">{typeLabel(type)}</h2>
                  <span className="text-xs text-muted-foreground">({recs.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recs.map((r) => (
                    <Card key={r._id} className="group rounded-2xl border-border/60 p-5 glass hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(r.recordDate).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteRecord(r._id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Delete record"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {r.description && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                      )}
                      {r.diagnosis?.primary && (
                        <p className="mt-2 text-xs"><span className="text-muted-foreground">Diagnosis: </span>{r.diagnosis.primary}</p>
                      )}
                      {r.labResults && r.labResults.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {r.labResults.slice(0, 3).map((l, i) => (
                            <p key={i} className={`text-xs ${l.isAbnormal ? "text-destructive" : "text-muted-foreground"}`}>
                              {l.test}: <span className="font-medium">{l.result}</span>
                              {l.isAbnormal && " ⚠"}
                            </p>
                          ))}
                        </div>
                      )}
                      {r.attachments && r.attachments.length > 0 && (
                        <a
                          href={r.attachments[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" /> View attachment
                        </a>
                      )}
                      {r.isOfflineSynced === false && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                          <WifiOff className="h-2.5 w-2.5" /> Pending sync
                        </span>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Add Record Dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-2xl border-border/60 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Add health record</h3>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={addRecord} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Record type</Label>
                <select
                  value={newRec.type}
                  onChange={(e) => setNewRec((r) => ({ ...r, type: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="lab_report">Lab report</option>
                  <option value="prescription">Prescription</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="vitals">Vitals</option>
                  <option value="diagnosis">Diagnosis</option>
                  <option value="imaging">Imaging (X-ray, MRI…)</option>
                  <option value="surgery">Surgery / Procedure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rtitle">Title *</Label>
                <Input
                  id="rtitle"
                  required
                  value={newRec.title}
                  onChange={(e) => setNewRec((r) => ({ ...r, title: e.target.value }))}
                  placeholder="CBC Report, Metformin prescription…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rdate">Date *</Label>
                <Input
                  id="rdate"
                  type="date"
                  required
                  value={newRec.recordDate}
                  onChange={(e) => setNewRec((r) => ({ ...r, recordDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rdesc">Notes</Label>
                <Input
                  id="rdesc"
                  value={newRec.description}
                  onChange={(e) => setNewRec((r) => ({ ...r, description: e.target.value }))}
                  placeholder="Additional details…"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Save record
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function typeIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    lab_report: <FlaskConical className="h-4 w-4 text-accent" />,
    prescription: <Pill className="h-4 w-4 text-primary" />,
    vaccination: <Syringe className="h-4 w-4 text-success" />,
    vitals: <Heart className="h-4 w-4 text-destructive" />,
    diagnosis: <FileText className="h-4 w-4 text-warning-foreground" />,
  };
  return map[type] ?? <FileText className="h-4 w-4 text-muted-foreground" />;
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    lab_report: "Lab reports",
    prescription: "Prescriptions",
    vaccination: "Vaccinations",
    vitals: "Vitals",
    diagnosis: "Diagnoses",
    imaging: "Imaging",
    surgery: "Surgery / Procedures",
    other: "Other",
  };
  return map[type] ?? type;
}
