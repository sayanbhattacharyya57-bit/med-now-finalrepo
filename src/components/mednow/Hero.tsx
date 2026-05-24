import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, ShieldCheck, Stethoscope, Wifi } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Hero({ onBook, onSOS }: { onBook: () => void; onSOS: () => void }) {
  const { t } = useI18n();
  return (
    <section id="home" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-soft)" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-80" />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:py-24 md:gap-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="mb-5 w-fit gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("hero.badge")}
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {t("hero.title.a")}{" "}
            <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
              {t("hero.title.b")}
            </span>
            {t("hero.title.c")}
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            {t("hero.sub")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={onBook} size="lg" className="rounded-full px-6 shadow-[var(--shadow-soft)]">
              <Calendar className="mr-2 h-4 w-4" /> {t("hero.book")}
            </Button>
            <Button
              onClick={onSOS}
              variant="outline"
              size="lg"
              className="rounded-full border-destructive/30 px-6 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              {t("hero.sos")}
            </Button>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { k: "10k+", v: "Doctors" },
              { k: "4", v: "Languages" },
              { k: "24/7", v: "AI triage" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-2xl font-bold text-foreground">{s.k}</dt>
                <dd className="text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <div
              className="rounded-3xl p-6 shadow-[var(--shadow-glow)] glass"
            >
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Dr. Anita Sharma</p>
                  <p className="text-xs text-muted-foreground">General Physician · Online</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <Row icon={<Activity className="h-4 w-4" />} label="Symptom check" value="Mild" tone="success" />
                <Row icon={<Wifi className="h-4 w-4" />} label="Connection" value="2G optimized" tone="primary" />
                <Row icon={<ShieldCheck className="h-4 w-4" />} label="Records" value="Synced offline" tone="accent" />
              </div>

              <Button className="mt-5 w-full rounded-xl" size="lg">
                Join consultation
              </Button>
            </div>

            <div className="absolute -right-6 -top-6 hidden rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:block">
              <p className="text-xs text-muted-foreground">Next appointment</p>
              <p className="text-sm font-semibold">Today · 4:30 PM</p>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:block">
              <p className="text-xs text-muted-foreground">Medicine in stock</p>
              <p className="text-sm font-semibold text-success">3 pharmacies nearby</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "primary" | "accent";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "primary"
      ? "bg-primary-soft text-primary"
      : "bg-accent-soft text-accent";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-semibold">{value}</span>
    </div>
  );
}