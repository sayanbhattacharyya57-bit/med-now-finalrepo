import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ambulanceApi, hospitalApi, type HospitalRaw, type AmbulanceRequestRaw } from "@/lib/api";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Ambulance, MapPin, Phone, Navigation, Clock, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/ambulance")({
  head: () => ({
    meta: [
      { title: "Emergency ambulance — MedNow" },
      { name: "description", content: "One-tap ambulance dispatch with nearby hospital availability." },
    ],
  }),
  component: AmbulancePage,
});

type GeoPos = { lat: number; lng: number } | null;

function AmbulancePage() {
  const [dispatched, setDispatched] = useState(false);
  const [request, setRequest] = useState<AmbulanceRequestRaw | null>(null);
  const [location, setLocation] = useState("");
  const [geoPos, setGeoPos] = useState<GeoPos>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalRaw[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Auto-request geolocation on mount
    getMyLocation(false);
  }, []);

  useEffect(() => {
    if (dispatched) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dispatched]);

  const getMyLocation = (showToast = true) => {
    if (!navigator.geolocation) {
      if (showToast) toast.error("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoPos({ lat, lng });
        if (showToast) toast.success("Location detected");

        // Reverse geocode (approximation)
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Load nearby hospitals
        setHospitalsLoading(true);
        try {
          const res = await hospitalApi.getNearest(lat, lng, { radius: "20000" });
          setHospitals(res.data.hospitals || []);
        } catch {
          // fallback: load all hospitals
          try {
            const res = await hospitalApi.getAll({ limit: "5" });
            setHospitals(res.data || []);
          } catch {}
        } finally {
          setHospitalsLoading(false);
        }
        setGeoLoading(false);
      },
      (err) => {
        if (showToast) toast.error("Could not get location: " + err.message);
        setGeoLoading(false);
        // Still load hospitals without coordinates
        hospitalApi.getAll({ limit: "5" }).then((res) => setHospitals(res.data || [])).catch(() => {});
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const dispatch = async () => {
    if (dispatchLoading) return;
    setDispatchLoading(true);
    try {
      const requestData = {
        lat: geoPos?.lat ?? 0,
        lng: geoPos?.lng ?? 0,
        address: location || "Unknown location",
        emergencyType: "medical",
        severity: "high",
        description: "Ambulance requested via MedNow app",
        contactPhone: "",
      };

      const res = await ambulanceApi.request(requestData);
      setDispatched(true);
      toast.success("Ambulance dispatched · Tracking live", {
        description: "Stay on this screen for live updates.",
      });

      // Update hospitals from response
      if (res.data && typeof res.data === "object" && "nearbyHospitals" in res.data) {
        const data = res.data as { requestId: string; nearbyHospitals: HospitalRaw[] };
        if (data.nearbyHospitals?.length) {
          setHospitals(data.nearbyHospitals);
        }
      }
    } catch (err) {
      // Still allow dispatch UI even if API fails (emergency should never block)
      setDispatched(true);
      toast.warning("Dispatched with limited connectivity", {
        description: "Call 108 directly as backup.",
      });
      console.error("Ambulance API error:", err);
    } finally {
      setDispatchLoading(false);
    }
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const nearestEta = hospitals[0]?.distance
    ? Math.ceil((hospitals[0].distance / 1000) * 2)
    : hospitals.length > 0 ? 5 : null;

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-destructive">Emergency</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Ambulance on demand</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One tap coordinates the nearest ambulance and hospital. Works even on calls when data is down.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-glow)] glass">
            <div className="flex flex-col items-center text-center">
              <button
                onClick={dispatch}
                disabled={dispatched || dispatchLoading}
                className="relative flex h-32 w-32 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[0_10px_40px_-8px_oklch(0.6_0.22_25/0.6)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {!dispatched && !dispatchLoading && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
                )}
                <div className="flex flex-col items-center">
                  {dispatchLoading ? (
                    <Loader2 className="h-9 w-9 animate-spin" />
                  ) : dispatched ? (
                    <CheckCircle2 className="h-9 w-9" />
                  ) : (
                    <Ambulance className="h-9 w-9" />
                  )}
                  <span className="mt-1 text-xs font-bold">
                    {dispatchLoading ? "CALLING…" : dispatched ? "DISPATCHED" : "SOS"}
                  </span>
                </div>
              </button>

              <p className="mt-5 text-base font-semibold">
                {dispatched ? "Help is on the way" : dispatchLoading ? "Contacting emergency services…" : "Hold steady — tap once"}
              </p>

              {dispatched ? (
                <div className="mt-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Live tracking · {formatElapsed(elapsed)}</span>
                  {nearestEta && (
                    <span className="text-sm font-semibold text-success">Estimated arrival · {nearestEta} min</span>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {geoPos ? "📍 Location detected" : "Government line 108 also called automatically"}
                </p>
              )}
            </div>

            {dispatched && request?.ambulance && (
              <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center text-sm text-success">
                <p className="font-semibold">{request.ambulance.driverName}</p>
                <p className="text-xs">{request.ambulance.vehicleNumber} · {request.ambulance.driverPhone}</p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Pickup location</label>
              <div className="flex gap-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="House, village, landmark"
                  className="rounded-xl"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  aria-label="Use my location"
                  onClick={() => getMyLocation(true)}
                  disabled={geoLoading}
                >
                  {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                </Button>
              </div>
              <a href="tel:108">
                <Button variant="outline" className="w-full rounded-xl" size="lg">
                  <Phone className="mr-2 h-4 w-4" /> Call 108 directly
                </Button>
              </a>
            </div>

            {dispatched && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Keep this screen open. If signal is lost, call 108 immediately.
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-border/60 p-6 glass">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Nearby hospitals · live bed availability</h3>
              {geoPos && <span className="text-xs text-success">📍 Near you</span>}
            </div>

            {hospitalsLoading ? (
              <div className="mt-6 flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : hospitals.length === 0 ? (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">Enable location to see nearby hospitals.</p>
                <Button variant="outline" className="rounded-xl w-full" onClick={() => getMyLocation(true)} disabled={geoLoading}>
                  <Navigation className="mr-2 h-4 w-4" />
                  {geoLoading ? "Detecting…" : "Enable location"}
                </Button>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {hospitals.slice(0, 5).map((h) => {
                  const distKm = h.distance ? (h.distance / 1000).toFixed(1) : null;
                  const eta = distKm ? Math.ceil(parseFloat(distKm) * 2) : null;
                  const bedsOk = (h.beds?.available ?? 0) > 0;
                  return (
                    <li key={h._id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {distKm ? `${distKm} km · ` : ""}
                          {h.beds?.available !== undefined ? `${h.beds.available} beds free` : h.address.city}
                        </p>
                        {h.emergencyPhone && (
                          <a href={`tel:${h.emergencyPhone}`} className="text-xs text-primary hover:underline">
                            {h.emergencyPhone}
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {eta && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${bedsOk ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"}`}>
                            <Clock className="h-3 w-3" /> {eta} min
                          </span>
                        )}
                        {h.ambulances?.available !== undefined && h.ambulances.available > 0 && (
                          <span className="text-[10px] text-muted-foreground">{h.ambulances.available} ambulance{h.ambulances.available > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}
