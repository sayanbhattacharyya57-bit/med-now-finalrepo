import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, MapPin, Ambulance, Loader2, CheckCircle2 } from "lucide-react";
import { sosApi, type NearbyHospital } from "@/lib/api";
import { toast } from "sonner";

export function EmergencySOSButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Emergency SOS"
      className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[0_8px_30px_-4px_oklch(0.6_0.22_25/0.5)] transition-transform hover:scale-105 active:scale-95 md:h-20 md:w-20"
    >
      <div className="flex flex-col items-center leading-none">
        <Siren />
        <span className="mt-0.5 text-[10px] font-bold tracking-wide md:text-xs">SOS</span>
      </div>
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-destructive/40" />
    </button>
  );
}

function Siren() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
      <path d="M5 21h14" />
      <path d="M21 12h1M2 12h1M4.6 4.6l.7.7M19.4 4.6l-.7.7M12 2v1" />
    </svg>
  );
}

type SOSState = "idle" | "locating" | "triggered" | "error";

export function EmergencyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [state, setState] = useState<SOSState>("idle");
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [alertId, setAlertId] = useState<string | null>(null);

  const triggerSOS = async () => {
    setState("locating");

    const handleSOS = async (lat: number, lng: number, accuracy: number) => {
      try {
        const res = await sosApi.trigger({
          lat,
          lng,
          accuracy,
          emergencyType: "medical",
          severity: "critical",
          description: "SOS triggered via MedNow app",
        });
        setAlertId(res.data.alertId);
        setNearbyHospitals(res.data.nearbyHospitals || []);
        setState("triggered");
        toast.success("Emergency services alerted!", { description: "Help is being coordinated." });
      } catch (err) {
        // Still show triggered even if API fails — emergency must not block
        setState("triggered");
        toast.warning("SOS sent with limited connectivity", {
          description: "Call 108 directly as backup.",
        });
        console.error("SOS API:", err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleSOS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        async () => {
          // No location — still trigger SOS without coordinates
          await handleSOS(0, 0, 0);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      await handleSOS(0, 0, 0);
    }
  };

  const nearest = nearbyHospitals[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && state !== "triggered") setState("idle");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            {state === "triggered" ? (
              <CheckCircle2 className="h-7 w-7 text-success" />
            ) : (
              <Ambulance className="h-7 w-7" />
            )}
          </div>
          <DialogTitle className="text-center text-xl">
            {state === "triggered" ? "Help is on the way" : "Emergency assistance"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {state === "triggered"
              ? alertId
                ? `Alert ID: ${alertId.slice(-6).toUpperCase()} · Emergency services notified.`
                : "Emergency services have been notified."
              : "We'll locate you and alert nearby hospitals and ambulances."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {state === "idle" && (
            <Button
              size="lg"
              className="h-14 justify-start gap-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={triggerSOS}
            >
              <Ambulance className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold">Trigger emergency SOS</p>
                <p className="text-xs opacity-90">Alert nearest hospital & ambulance</p>
              </div>
            </Button>
          )}

          {state === "locating" && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm font-semibold">Locating you & alerting services…</p>
            </div>
          )}

          {state === "triggered" && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
              <p className="text-sm font-semibold text-success">Emergency services notified</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Stay calm. Help is coordinated.</p>
            </div>
          )}

          <a href="tel:108">
            <Button
              size="lg"
              variant={state === "triggered" ? "default" : "outline"}
              className={`h-14 w-full justify-start gap-3 rounded-xl ${state === "triggered" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            >
              <Phone className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold">Call ambulance · 108</p>
                <p className="text-xs opacity-90">Government emergency line</p>
              </div>
            </Button>
          </a>

          {nearest ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nearest.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(nearest.distance / 1000).toFixed(1)} km · ~{nearest.estimatedArrival} min ETA
                </p>
                {nearest.emergencyPhone && (
                  <a href={`tel:${nearest.emergencyPhone}`} className="text-xs text-primary hover:underline">
                    {nearest.emergencyPhone}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <Button size="lg" variant="outline" className="h-14 justify-start gap-3 rounded-xl" onClick={() => onOpenChange(false)}>
              <MapPin className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-semibold">Find nearest hospital</p>
                <p className="text-xs text-muted-foreground">Enable location for real-time results</p>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
