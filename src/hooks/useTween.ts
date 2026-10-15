import { useEffect, useState } from "react";

/**
 * Capital "en vivo": la tienda lo actualiza 4 veces por segundo; aquí se extrapola a 60 fps
 * sumando los ingresos del tiempo transcurrido desde la última actualización, así el número
 * sube de forma continua en vez de a saltos.
 */
export function useLiveValue(value: number, ratePerSecond: number, since: number): number {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    let id = 0;
    const step = () => {
      const elapsed = Math.min(1, Math.max(0, (Date.now() - since) / 1000));
      setShown(value + ratePerSecond * elapsed);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, ratePerSecond, since]);
  return shown;
}
