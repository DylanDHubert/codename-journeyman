import Link from "next/link";

import { CreateSettingsForm } from "@/components/create/CreateSettingsForm";
import { OceanBackground } from "@/components/home/OceanBackground";
import { WoodenHeader } from "@/components/home/WoodenHeader";

export default function CreatePage() {
  return (
    <main className="relative min-h-full flex-1 overflow-hidden bg-ocean-gradient">
      <OceanBackground />
      <div className="relative z-10 flex min-h-full flex-col">
        <WoodenHeader title="Create" subtitle="Codename: Journeyman" />
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
          <Link
            href="/"
            className="w-fit text-sm text-sky-200/70 transition hover:text-sky-100"
          >
            ← Home
          </Link>
          <CreateSettingsForm />
        </div>
      </div>
    </main>
  );
}
