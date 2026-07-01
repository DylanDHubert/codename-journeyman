import Link from "next/link";

import { WoodenHeader } from "@/components/home/WoodenHeader";

type HomeZoneProps = {
  title: string;
  description: string;
  href: string;
  eyebrow: string;
};

function HomeZone({ title, description, href, eyebrow }: HomeZoneProps) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-[rgb(4_24_40_/_0.55)] p-6 shadow-[0_12px_40px_rgb(2_12_22_/_0.35)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-sky-200/25 hover:bg-[rgb(8_36_58_/_0.62)]"
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgb(108_68_34),rgb(168_118_62)_35%,rgb(206_158_96)_50%,rgb(168_118_62)_65%,rgb(108_68_34))] opacity-90" />
      <div className="space-y-3 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200/55">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-sky-100/70">{description}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sky-200/80 transition group-hover:text-sky-100">
        Enter
        <span aria-hidden className="transition group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

export function HomePage() {
  return (
    <main className="relative min-h-full flex-1 overflow-hidden bg-ocean-gradient">
      <div className="relative flex min-h-full flex-col">
        <WoodenHeader title="Codename: Journeyman" subtitle="Bridge the Isles" />
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6">
          <p className="max-w-xl text-sm leading-relaxed text-sky-100/65">
            Chart courier routes across shifting archipelagos. Pick a level to play or
            forge a new island chain.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <HomeZone
              eyebrow="Campaign"
              title="Levels"
              description="Daily puzzles and curated routes waiting on the map."
              href="/play"
            />
            <HomeZone
              eyebrow="Workshop"
              title="Create"
              description="Shape archipelagos, tune generation, and test new crossings."
              href="/create"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
