import { Card } from "@/components/ui/card";
import {
  Video,
  FolderLock,
  Pill,
  Languages,
  Siren,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Telemedicine, optimized",
    desc: "Audio-first consultations that work on 2G. AI symptom checker pre-screens your visit and books you with the right doctor.",
    tone: "primary",
  },
  {
    icon: FolderLock,
    title: "Offline health records",
    desc: "Prescriptions, lab reports, and vaccination history stored locally and synced when you reconnect. Privacy by default.",
    tone: "accent",
  },
  {
    icon: Pill,
    title: "Medicine availability",
    desc: "Search any medicine and see real-time stock at pharmacies near you, with affordable alternatives suggested.",
    tone: "primary",
  },
  {
    icon: Languages,
    title: "Speaks your language",
    desc: "English, Hindi, Bengali and Punjabi with voice navigation — designed for first-time smartphone users.",
    tone: "accent",
  },
  {
    icon: Siren,
    title: "Emergency triage",
    desc: "AI classifies your case as Mild, Moderate or Emergency with color-coded urgency and instant routing.",
    tone: "destructive",
  },
  {
    icon: Brain,
    title: "AI health assistant",
    desc: "Always-on guidance for symptoms, dosages and follow-ups — trained on WHO and ICMR guidelines.",
    tone: "primary",
  },
] as const;

const toneMap = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  destructive: "bg-destructive/10 text-destructive",
};

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="mb-12 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Everything in one app
        </p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          Care that works where infrastructure doesn't.
        </h2>
        <p className="mt-3 text-muted-foreground">
          A lightweight, accessible platform built specifically for the realities
          of rural and underserved communities.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card
            key={f.title}
            className="group border-border/60 p-6 transition-shadow hover:shadow-[var(--shadow-soft)]"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[f.tone]}`}>
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}