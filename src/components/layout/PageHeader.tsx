type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
};

export function PageHeader({ eyebrow, title, detail }: PageHeaderProps) {
  return (
    <header className="border-b border-white/10 px-4 py-2.5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/55">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {detail ? <p className="mt-0.5 text-xs text-sky-100/60">{detail}</p> : null}
      </div>
    </header>
  );
}
