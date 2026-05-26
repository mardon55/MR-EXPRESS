export default function LiquidBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 min-h-dvh w-full overflow-hidden"
      style={{ minHeight: '100dvh' }}
      aria-hidden="true"
    >
      <div className="liquid-blob liquid-blob-1" />
      <div className="liquid-blob liquid-blob-2" />
      <div className="liquid-blob liquid-blob-3" />
      <div className="liquid-blob liquid-blob-4" />
    </div>
  );
}
