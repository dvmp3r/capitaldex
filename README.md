# CapitalDex

Juego incremental de navegador: abres carteras (gacha) y te salen **empresas reales cotizadas**. Las grandes son legendarias, las pequeñas comunes. Cada empresa genera capital por segundo, los duplicados son acciones y el mercado real mueve tus ingresos.

> Nombre provisional. Estado: fase 0/1, prototipo jugable de un jugador.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre http://localhost:5173.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run typecheck` | Solo comprobación de tipos |
| `npm test` | Pruebas unitarias de la lógica del juego y de los datos (Vitest) |
| `npm run data` | Regenera `src/data/companies.json` desde `data/empresas.xlsx` |
| `python scripts/fetch_companies.py` | Vuelve a descargar los datos de Yahoo Finance a `data/raw/` |

## Estructura

```
docs/            GDD.md (diseño), ROADMAP.md, LEGAL.md
data/            empresas.xlsx (fuente de verdad editable), raw/ (volcados de Yahoo)
scripts/         fetch_companies.py, build_data.py
src/game/        reglas puras: balance.ts, rarity.ts, gacha.ts, economy.ts, format.ts
src/store/       estado del juego (Zustand) con guardado local y progreso offline
src/components/  interfaz
src/data/        companies.json generado
```

## Cómo cambiar el equilibrio

Todas las constantes (umbrales de rareza, probabilidades, coste de cartera, fórmula de ingresos, bonus de sets) están en `src/game/balance.ts`. Los umbrales de rareza también están en la hoja `Umbrales` de `data/empresas.xlsx`; si cambias unos, cambia los otros y ejecuta `npm run data`.

## Aviso

CapitalDex no está afiliado ni respaldado por ninguna de las empresas que aparecen. Los datos son públicos, pueden tener retraso y se muestran con fines informativos y de entretenimiento. Esto es un juego, no una recomendación de inversión.
