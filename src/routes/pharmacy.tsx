import { useMemo, useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { medicineApi, type MedicineRaw } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Pill, MapPin, Search, Package, Loader2, RefreshCw, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({
    meta: [
      { title: "Pharmacy & medicines — MedNow" },
      { name: "description", content: "Real-time medicine stock at hospital pharmacies near you." },
    ],
  }),
  component: Pharmacy,
});

type NewMed = { name: string; genericName: string; category: string; quantity: string; unit: string; mrp: string; prescriptionRequired: boolean };

function Pharmacy() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [medicines, setMedicines] = useState<MedicineRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newMed, setNewMed] = useState<NewMed>({
    name: "", genericName: "", category: "tablet", quantity: "", unit: "tablets", mrp: "", prescriptionRequired: false,
  });
  const [saving, setSaving] = useState(false);
  const [updatingStock, setUpdatingStock] = useState<string | null>(null);

  const isAdmin = user?.role === "hospital_admin";

  const loadMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (q.trim()) params.search = q.trim();
      const res = await medicineApi.getAll(params);
      setMedicines(res.data || []);
    } catch {
      toast.error("Failed to load medicines. Showing cached data.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(loadMedicines, 400);
    return () => clearTimeout(timer);
  }, [loadMedicines]);

  const addMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.quantity) { toast.error("Name and quantity are required"); return; }
    setSaving(true);
    try {
      const res = await medicineApi.add({
        name: newMed.name,
        genericName: newMed.genericName || undefined,
        category: newMed.category,
        stock: { quantity: parseInt(newMed.quantity), unit: newMed.unit },
        price: newMed.mrp ? { mrp: parseFloat(newMed.mrp) } : undefined,
        prescriptionRequired: newMed.prescriptionRequired,
        isAvailable: true,
      });
      setMedicines((prev) => [res.data.medicine, ...prev]);
      setAddOpen(false);
      setNewMed({ name: "", genericName: "", category: "tablet", quantity: "", unit: "tablets", mrp: "", prescriptionRequired: false });
      toast.success("Medicine added to inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add medicine");
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (id: string, delta: number, current: number) => {
    const qty = current + delta;
    if (qty < 0) { toast.error("Stock cannot go below 0"); return; }
    setUpdatingStock(id);
    try {
      await medicineApi.updateStock(id, qty);
      setMedicines((prev) => prev.map((m) => m._id === id ? { ...m, stock: { ...m.stock, quantity: qty } } : m));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setUpdatingStock(null);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        (m.genericName || "").toLowerCase().includes(s) ||
        m.category.toLowerCase().includes(s) ||
        (m.hospital?.name || "").toLowerCase().includes(s)
    );
  }, [medicines, q]);

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pharmacy</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Find medicine, in real time.</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Hospital pharmacies update stock live. Reserve and pick up — or request delivery.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={loadMedicines} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {isAdmin && (
              <Button size="sm" className="rounded-full" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add medicine
              </Button>
            )}
          </div>
        </div>

        <Card className="mt-6 rounded-2xl border-border/60 p-4 glass">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by medicine, generic name, hospital…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
        </Card>

        {loading ? (
          <div className="mt-16 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading live stock…</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            {q ? "No medicines found. Try a different name." : "No medicines in the inventory yet."}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => {
              const qty = m.stock.quantity;
              const out = qty === 0;
              const low = qty > 0 && qty <= (m.stock.minThreshold ?? 10);
              return (
                <Card key={m._id} className="rounded-2xl border-border/60 p-5 glass">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.genericName || m.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${out ? "bg-destructive/10 text-destructive" : low ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success"}`}>
                      {out ? "Out" : low ? `Low · ${qty}` : `In stock · ${qty}`}
                    </span>
                  </div>

                  {m.hospital && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{m.hospital.name}</span>
                      {m.hospital.address?.city && (
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">{m.hospital.address.city}</span>
                      )}
                    </div>
                  )}

                  {m.prescriptionRequired && (
                    <p className="mt-2 text-xs text-warning-foreground">Prescription required</p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Price · </span>
                      <span className="font-bold">{m.price?.mrp ? `₹${m.price.mrp}` : "—"}</span>
                      {m.price?.isSubsidized && <span className="ml-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">Subsidised</span>}
                    </p>

                    {isAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateStock(m._id, -1, qty)}
                          disabled={updatingStock === m._id || qty === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm font-bold disabled:opacity-40 hover:border-primary/40 transition-colors"
                        >
                          −
                        </button>
                        {updatingStock === m._id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                        )}
                        <button
                          onClick={() => updateStock(m._id, 1, qty)}
                          disabled={updatingStock === m._id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm font-bold disabled:opacity-40 hover:border-primary/40 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <Button size="sm" className="rounded-lg" disabled={out}>
                        <Package className="mr-1.5 h-3.5 w-3.5" /> {out ? "Notify me" : "Reserve"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      {/* Add Medicine Dialog (admin only) */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-2xl border-border/60 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Add medicine to inventory</h3>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={addMedicine} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Brand name *</Label>
                  <Input required value={newMed.name} onChange={(e) => setNewMed((m) => ({ ...m, name: e.target.value }))} placeholder="Paracetamol 500mg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Generic name</Label>
                  <Input value={newMed.genericName} onChange={(e) => setNewMed((m) => ({ ...m, genericName: e.target.value }))} placeholder="Acetaminophen" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select value={newMed.category} onChange={(e) => setNewMed((m) => ({ ...m, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="tablet">Tablet</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="ointment">Ointment</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="vaccine">Vaccine</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <select value={newMed.unit} onChange={(e) => setNewMed((m) => ({ ...m, unit: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="tablets">Tablets</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                    <option value="strips">Strips</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity *</Label>
                  <Input required type="number" min="0" value={newMed.quantity} onChange={(e) => setNewMed((m) => ({ ...m, quantity: e.target.value }))} placeholder="100" />
                </div>
                <div className="space-y-1.5">
                  <Label>MRP (₹)</Label>
                  <Input type="number" min="0" value={newMed.mrp} onChange={(e) => setNewMed((m) => ({ ...m, mrp: e.target.value }))} placeholder="12" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewMed((m) => ({ ...m, prescriptionRequired: !m.prescriptionRequired }))}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${newMed.prescriptionRequired ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
              >
                <div className={`h-4 w-4 rounded border ${newMed.prescriptionRequired ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                Prescription required
              </button>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Add medicine
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
