const stats = [
  { k: "2.4M", v: "Consultations completed", d: "across 18 states" },
  { k: "12k", v: "Verified pharmacies", d: "live stock data" },
  { k: "94%", v: "Patients reached in <5 min", d: "even on 2G networks" },
  { k: "4.9★", v: "Average doctor rating", d: "from rural patients" },
];

export function Stats() {
  return (
    <section id="impact" className="bg-primary-soft/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Our impact</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Healthcare delivered, measurably.
            </h2>
          </div>
          <p className="text-sm text-muted-foreground md:max-w-xs">
            Numbers updated monthly. Verified with partner NGOs and primary health centers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.v}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <p className="bg-[image:var(--gradient-hero)] bg-clip-text text-4xl font-bold text-transparent">
                {s.k}
              </p>
              <p className="mt-2 text-sm font-semibold">{s.v}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}