import { useEffect, useRef, useState } from "react";

/** Suaviza un número que cambia a saltos (el capital se actualiza 4 veces por segundo): lo acerca cada fotograma. */
export function useTween(target: number, speed = 10): number {
  const [value, setValue] = useState(target);
  const ref = useRef({ value: target, target, last: 0 });
  ref.current.target = target;
  useEffect(() => {
    let id = 0;
    const step = (now: number) => {
      const r = ref.current;
      const dt = r.last ? Math.min(0.1, (now - r.last) / 1000) : 1 / 60;
      r.last = now;
      const diff = r.target - r.value;
      if (Math.abs(diff) < Math.max(0.5, Math.abs(r.target) * 1e-6)) {
        r.value = r.target;
      } else {
        r.value += diff * Math.min(1, dt * speed);
      }
      setValue(r.value);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [speed]);
  return value;
}
