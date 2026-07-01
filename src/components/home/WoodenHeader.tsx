type WoodenHeaderProps = {
  title: string;
  subtitle?: string;
};

function BridgePylon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-sm border border-[rgb(48_28_12)] bg-[linear-gradient(135deg,rgb(186_132_72),rgb(132_86_44)_45%,rgb(74_44_20))] shadow-[inset_0_1px_0_rgb(206_158_96_/_0.35)] ${className ?? ""}`}
    />
  );
}

function BridgeRail() {
  return (
    <div
      aria-hidden
      className="relative flex h-3 w-full items-center justify-between px-2"
    >
      <BridgePylon className="h-3 w-3" />
      <span className="mx-2 h-1.5 flex-1 rounded-sm bg-[linear-gradient(180deg,rgb(206_158_96),rgb(168_118_62)_55%,rgb(108_68_34))] shadow-[inset_0_1px_0_rgb(232_190_130_/_0.45),0_1px_0_rgb(74_44_20_/_0.5)]" />
      <BridgePylon className="h-3 w-3" />
      <span className="mx-2 h-1.5 flex-1 rounded-sm bg-[linear-gradient(180deg,rgb(206_158_96),rgb(168_118_62)_55%,rgb(108_68_34))] shadow-[inset_0_1px_0_rgb(232_190_130_/_0.45),0_1px_0_rgb(74_44_20_/_0.5)]" />
      <BridgePylon className="h-3 w-3" />
    </div>
  );
}

export function WoodenHeader({ title, subtitle }: WoodenHeaderProps) {
  return (
    <header className="relative w-full overflow-hidden shadow-[0_8px_24px_rgb(4_16_24_/_0.45)]">
      <div className="wood-plank relative px-6 pb-4 pt-5 sm:px-10 sm:pt-6">
        <div className="pointer-events-none absolute inset-0 wood-plank-grain opacity-60" />
        <div className="relative flex flex-col items-center gap-2 text-center">
          {subtitle ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[rgb(58_34_14)]/80">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(42_24_10)] sm:text-3xl">
            {title}
          </h1>
        </div>
      </div>
      <BridgeRail />
    </header>
  );
}
