import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, Video, Stethoscope, Loader2 } from "lucide-react";
import { authApi, appointmentApi, type DoctorRaw, type SlotRaw } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TYPES = [
  { id: "voice_call" as const, label: "Audio (2G)", icon: Stethoscope },
  { id: "video_call" as const, label: "Video", icon: Video },
  { id: "in_person" as const, label: "In-person", icon: CalendarDays },
];

export function AppointmentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<"voice_call" | "video_call" | "in_person">("voice_call");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<SlotRaw | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  const [doctors, setDoctors] = useState<DoctorRaw[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRaw | null>(null);
  const [slots, setSlots] = useState<SlotRaw[]>([]);

  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load doctors when modal opens
  useEffect(() => {
    if (!open) return;
    setDoctorsLoading(true);
    authApi.getDoctors({ isAvailable: "true" })
      .then((res) => {
        setDoctors(res.data || []);
        if (res.data?.length) setSelectedDoctor(res.data[0]);
      })
      .catch(() => {})
      .finally(() => setDoctorsLoading(false));
  }, [open]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate || !open) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    appointmentApi.getSlots(selectedDoctor._id, selectedDate)
      .then((res) => {
        const available = (res.data.slots || []).filter((s: SlotRaw) => s.isAvailable);
        setSlots(available);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctor, selectedDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) { toast.error("Please select a doctor"); return; }
    if (!selectedSlot) { toast.error("Please select a time slot"); return; }
    if (!user) { toast.error("Please sign in to book an appointment"); return; }

    setSubmitting(true);
    try {
      await appointmentApi.book({
        doctorId: selectedDoctor._id,
        type,
        scheduledAt: selectedSlot.datetime,
        symptoms: symptoms.trim() ? symptoms.split(",").map((s) => s.trim()).filter(Boolean) : [],
        notes: notes.trim() || undefined,
      });

      toast.success(`Appointment confirmed for ${new Date(selectedSlot.datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`);
      onOpenChange(false);
      // Reset
      setSymptoms("");
      setNotes("");
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>
            A doctor will reach out at your chosen slot. Works on slow networks.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Doctor selection */}
          <div className="space-y-2">
            <Label>Select doctor</Label>
            {doctorsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading doctors…
              </div>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No doctors available right now.</p>
            ) : (
              <div className="grid gap-2">
                {doctors.slice(0, 4).map((d) => (
                  <button
                    key={d._id}
                    type="button"
                    onClick={() => setSelectedDoctor(d)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${selectedDoctor?._id === d._id ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.doctorProfile?.specialization || "General"}</p>
                    </div>
                    {d.doctorProfile?.consultationFee && (
                      <span className="shrink-0 text-xs font-medium">₹{d.doctorProfile.consultationFee}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Consultation type */}
          <div className="space-y-2">
            <Label>Consultation type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-colors ${type === t.id ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="appt-date">Date</Label>
            <Input
              id="appt-date"
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <Label>Available slots {selectedDate && `· ${new Date(selectedDate + "T00:00:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}`}</Label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots available for this date. Try another day.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.slice(0, 12).map((s) => (
                  <button
                    type="button"
                    key={s.datetime}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${selectedSlot?.datetime === s.datetime ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Symptoms */}
          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
            <Textarea
              id="symptoms"
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Fever, cough, headache…"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="appt-notes">Additional notes</Label>
            <Input
              id="appt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the doctor should know"
            />
          </div>

          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={submitting || !selectedDoctor || !selectedSlot}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming…</> : "Confirm appointment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
