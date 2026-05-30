export default function ProductSpecifications({ specs }) {
  if (!specs || specs.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-[15px] font-semibold text-neutral-800">
        Texnik xususiyatlar
      </h2>
      <div className="overflow-hidden rounded-2xl border border-neutral-100 divide-y divide-neutral-100 bg-white shadow-sm">
        {specs.map((s, i) => (
          <div
            key={s.label + i}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="shrink-0 text-[13px] text-neutral-500">{s.label}</span>
            <span className="text-right text-[13px] font-semibold text-neutral-800 leading-snug">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
