export default function ProductSpecifications({ specs }) {
  if (!specs || specs.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-[15px] font-semibold text-neutral-800">
        Texnik xususiyatlar
      </h2>
      <div
        className="overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/5"
        style={{
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        {specs.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-4 px-4 py-3.5"
          >
            <span className="shrink-0 text-sm text-slate-400">{s.label}</span>
            <span className="text-right text-sm font-medium text-white leading-snug">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
