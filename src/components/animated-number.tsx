import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
};

/** Counts a KPI up once when it first appears. Short, subtle, never looping. */
export function AnimatedNumber({ value, format, duration = 650, className }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>{format ? format(display) : Math.round(display).toString()}</span>
  );
}
