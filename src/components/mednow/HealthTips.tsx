import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Droplets, Salad, Moon, Footprints, Sun, HandHeart } from "lucide-react";

const tips = [
  { icon: Droplets, title: "Drink safe water", body: "Boil drinking water for 1 minute during monsoons to prevent waterborne illness." },
  { icon: Salad, title: "Eat seasonal", body: "Local seasonal vegetables provide more nutrition at a lower cost than imports." },
  { icon: Moon, title: "Sleep 7–8 hours", body: "Consistent rest strengthens immunity and lowers blood pressure." },
  { icon: Footprints, title: "Walk 30 minutes", body: "A daily walk after dinner reduces diabetes risk by up to 40%." },
  { icon: Sun, title: "Morning sunlight", body: "15 minutes of early sunlight builds natural vitamin D for stronger bones." },
  { icon: HandHeart, title: "Wash hands often", body: "Soap for 20 seconds prevents the spread of most common infections." },
];

export function HealthTips() {
  return (
    <section id="tips" className="mx-auto max-w-6xl px-4 py-20 md:py-24">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Daily wellness</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Health tips, plainly said.</h2>
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {tips.map((t) => (
            <CarouselItem key={t.title} className="basis-full pl-3 sm:basis-1/2 lg:basis-1/3">
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-6 flex justify-end gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </section>
  );
}