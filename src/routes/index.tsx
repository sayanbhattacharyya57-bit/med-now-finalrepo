import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Hero } from "@/components/mednow/Hero";
import { Features } from "@/components/mednow/Features";
import { Stats } from "@/components/mednow/Stats";
import { HealthTips } from "@/components/mednow/HealthTips";
import { AIAssistant } from "@/components/mednow/AIAssistant";
import { Footer } from "@/components/mednow/Footer";
import { AppointmentModal } from "@/components/mednow/AppointmentModal";
import {
  EmergencySOSButton,
  EmergencyDialog,
} from "@/components/mednow/EmergencySOS";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedNow — Healthcare for every village" },
      {
        name: "description",
        content:
          "Low-bandwidth telemedicine, offline health records and real-time medicine availability for rural and underserved communities.",
      },
      { property: "og:title", content: "MedNow — Healthcare for every village" },
      {
        property: "og:description",
        content:
          "Telemedicine, offline records and AI triage built for 2G/3G networks and 4 Indian languages.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [bookOpen, setBookOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar onBook={() => setBookOpen(true)} />
      <main>
        <Hero onBook={() => setBookOpen(true)} onSOS={() => setSosOpen(true)} />
        <Features />
        <Stats />
        <HealthTips />
        <AIAssistant />
      </main>
      <Footer />

      <EmergencySOSButton onClick={() => setSosOpen(true)} />
      <EmergencyDialog open={sosOpen} onOpenChange={setSosOpen} />
      <AppointmentModal open={bookOpen} onOpenChange={setBookOpen} />
      <Toaster position="top-center" />
    </div>
  );
}
