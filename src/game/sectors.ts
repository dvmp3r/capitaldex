/** Tono OKLCH por sector. Es la identidad visual de cada empresa en su carta. */
const SECTOR_HUE: Record<string, number> = {
  "Tecnología": 255,
  "Finanzas": 20,
  "Salud": 160,
  "Consumo cíclico": 45,
  "Consumo básico": 95,
  "Comunicación": 300,
  "Industria": 225,
  "Energía": 30,
  "Materiales": 70,
  "Inmobiliario": 335,
  "Servicios públicos": 190,
};

export function sectorHue(sector: string): number {
  return SECTOR_HUE[sector] ?? 353;
}

export function sectorColor(sector: string, l = 0.78, c = 0.16, alpha = 1): string {
  const hue = sectorHue(sector);
  return alpha === 1 ? `oklch(${l} ${c} ${hue})` : `oklch(${l} ${c} ${hue} / ${alpha})`;
}
