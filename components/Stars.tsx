/** Read-only star rating, e.g. 4.3 → four full stars and a third of one. */
export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  const id = `stars-${Math.round(value * 10)}-${size}`;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const star = "M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z";
  return (
    <svg
      className="stars"
      width={size * 5 + 8}
      height={size}
      viewBox="0 0 128 24"
      role="img"
      aria-label={label ?? `${value} out of 5 stars`}
    >
      <defs>
        <clipPath id={id}>
          <rect width={`${pct}%`} height="24" />
        </clipPath>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={star} transform={`translate(${i * 26} 0)`} className="star-empty" />
      ))}
      <g clipPath={`url(#${id})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={star} transform={`translate(${i * 26} 0)`} className="star-full" />
        ))}
      </g>
    </svg>
  );
}
