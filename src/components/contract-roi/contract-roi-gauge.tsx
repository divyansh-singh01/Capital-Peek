import { useEffect, useRef, useState } from "react";

type Props = {
  /** Current value in currency units. */
  value: number;
  /** Reference maximum used to scale the arc. */
  max: number;
  label: string;
  format: (v: number) => string;
};

const R = 80;
const CIRC = Math.PI * R; // semicircle length

/** Premium semi-circular gauge. Caps the arc but always shows the true number. */
export function ContractRoiGauge({ value, max, label, format }: Props) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const [drawn, setDrawn] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDrawn(ratio);
      return;
    }
    const from = drawn;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 500);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(from + (ratio - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  return (
    <div
      className="relative mx-auto w-full max-w-[320px]"
      role="img"
      aria-label={`${label}: ${format(value)}`}
    >
      <svg viewBox="0 0 200 112" className="w-full">
        <defs>
          <linearGradient id="cr-gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <path
          d={`M 20 100 A ${R} ${R} 0 0 1 180 100`}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M 20 100 A ${R} ${R} 0 0 1 180 100`}
          fill="none"
          stroke="url(#cr-gauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - drawn)}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
        <div className="num text-[32px] font-semibold leading-none tracking-tight sm:text-[40px]">
          {format(value)}
        </div>
        <p className="mt-2 max-w-[240px] text-center text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="mt-1 flex justify-between px-2 text-[11px] text-muted-foreground">
        <span>0</span>
        <span>Scale to {format(max)}</span>
      </div>
    </div>
  );
}
