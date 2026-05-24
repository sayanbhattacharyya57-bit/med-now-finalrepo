import { Heart, Phone, Ambulance, ShieldAlert } from "lucide-react";

const emergency = [
  { icon: Ambulance, label: "Ambulance", value: "108" },
  { icon: ShieldAlert, label: "Women Helpline", value: "1091" },
  { icon: Phone, label: "Child Helpline", value: "1098" },
  { icon: Phone, label: "MedNow Support", value: "1800-200-200" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground">
                <Heart className="h-5 w-5" fill="currentColor" />
              </div>
              <span className="text-lg font-bold">MedNow</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Quality healthcare for rural and underserved communities — built for
              every network, every language.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#impact" className="hover:text-foreground">Impact</a></li>
              <li><a href="#tips" className="hover:text-foreground">Health tips</a></li>
              <li><a href="#assistant" className="hover:text-foreground">AI assistant</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Emergency contacts</h4>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {emergency.map((e) => (
                <li
                  key={e.label}
                  className="rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <e.icon className="h-3.5 w-3.5 text-destructive" />
                    {e.label}
                  </div>
                  <p className="mt-1 text-base font-bold tracking-wide">{e.value}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} MedNow Health Technologies. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}