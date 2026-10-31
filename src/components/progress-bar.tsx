export function ProgressBar({
  value,
  total,
  className = "",
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-powder ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-l from-deep to-dusty transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
