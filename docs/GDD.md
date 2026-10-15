# CapitalDex — Documento de diseño (GDD)

> Nombre provisional. Versión 0.1 — 15 de octubre de 2026.
> Estado: diseño inicial para la fase 1 (MVP de un jugador).

## 1. Visión

**Pitch:** un juego incremental de navegador en el que abres carteras (gacha) y te salen **empresas reales que cotizan en bolsa**. Las más grandes son legendarias; las pequeñas, comunes. Cada empresa que posees genera capital por segundo, los duplicados se convierten en acciones y el mercado real mueve tus ingresos cada día. Compite en un ranking mundial y en ligas semanales.

**Frase corta:** *Colecciona el mercado. Haz crecer tu capital.*

**Público:** jugadores de incrementales e idle (r/incremental_games, itch.io, Kongregate), aficionados a la bolsa que ya usan simuladores, y estudiantes de finanzas. Edad objetivo: mayores de 16; el gacha con dinero real se diseña para mayores de 18 o se evita.

**Plataforma:** navegador de escritorio y móvil (PWA). Más adelante Steam y tiendas móviles.

**Pilares de diseño**

1. **Datos reales como contenido.** Las empresas, su tamaño, sus dividendos y su cotización son el contenido del juego. No inventamos nada que el mercado nos dé gratis.
2. **Los duplicados nunca sobran.** Cada copia repetida es una acción más. No existe la frustración clásica del gacha.
3. **El mundo cambia.** La rareza se recalcula con la capitalización real. Un ascenso real de una empresa es un evento del juego.
4. **Aprender sin querer.** Quien juega acaba sabiendo qué es el PER, un dividendo o un índice, sin que el juego se lo explique en un tutorial.
5. **Justo en lo económico.** Nada de pagar por tiradas hasta tener claro el marco legal. Se monetiza con cosméticos y pase de temporada.

## 2. Bucle de juego

```
 ganar capital (pasivo + clic)  ->  abrir cartera (gacha)  ->  nueva empresa o acción extra
        ^                                                               |
 completar sets / subir ligas   <-   más ingresos por segundo   <-   colección más grande
```

- **Corto plazo (minutos):** acumular capital, abrir carteras, ver qué sale, subir acciones.
- **Medio plazo (días):** completar índices (Dow 30, IBEX 35...), alcanzar hitos de acciones, subir de división en la liga semanal.
- **Largo plazo (semanas):** prestigio mediante fusiones que crean tu propio holding, temporadas con rareza recalculada, ranking mundial.

## 3. Empresas y rareza

### Universo

Unas 380 empresas en la fase 1: Dow 30, Nasdaq-100, las mayores del S&P 500, IBEX 35, DAX 40, Euro Stoxx 50, las 20 mayores del Reino Unido y unas 25 grandes de Asia y Oriente Medio. Lista y datos en `data/empresas.xlsx`; se exporta a `src/data/companies.json` con `npm run data`.

Cada carta muestra: ticker, nombre, sector, país, bolsa, capitalización, ingresos anuales, beneficio neto, rentabilidad por dividendo y PER. Son datos informativos y educativos.

### Niveles de rareza

La rareza depende de la **capitalización bursátil en dólares**. Los umbrales viven en `src/game/balance.ts` (la verdad del juego) y se replican en la hoja `Umbrales` del Excel para analizar el reparto. La hoja permite además forzar una rareza manual o excluir una empresa.

| Rareza | Capitalización (USD) | Color | Reparto real (15-oct-2026) |
|---|---|---|---|
| Legendaria | ≥ 1,2 billones (1,2 T) | dorado | ~3 % |
| Épica | 350 000 M – 1,2 T | morado | ~6 % |
| Rara | 150 000 M – 350 000 M | azul | ~20 % |
| Poco común | 55 000 M – 150 000 M | verde | ~40 % |
| Común | < 55 000 M | gris | ~30 % |

El universo inicial está sesgado hacia las grandes (son las que forman los índices), por eso los umbrales son más altos que en un reparto por capitalización general. Si se añaden empresas pequeñas en fases posteriores, los umbrales bajarán. Cuando el reparto se desvíe, se ajustan los umbrales, no la lista.

### Rareza viva

Al inicio de cada temporada (cada 3 meses) se recalcula la capitalización y la rareza. Reglas:

- Una empresa que **sube** de rareza conserva las acciones de sus dueños; sus cartas pasan a valer más. Se anuncia como evento ("Nvidia asciende a legendaria").
- Una empresa que **baja** de rareza mantiene su rareza anterior durante una temporada de gracia (marcada como "en revisión") y después baja. Los dueños reciben una compensación en capital.
- Una empresa que sale de bolsa (OPA, quiebra) se convierte en **carta histórica**: deja de salir en el gacha, sigue produciendo y pasa a ser coleccionable.

## 4. Gacha

### Coste de la cartera

```
coste(n) = 100 × 1,08^n        n = carteras abiertas (sin contar las gratis)
```

Las tres primeras carteras son gratis (tutorial). El exponente se ajustará con datos de juego; el objetivo es que entre cartera y cartera pasen de 30 segundos al principio a unos 10 minutos tras 100 tiradas, antes de que entren las mejoras y el prestigio.

### Probabilidades (se muestran siempre en pantalla)

| Rareza | Probabilidad |
|---|---|
| Común | 55 % |
| Poco común | 27 % |
| Rara | 12 % |
| Épica | 5 % |
| Legendaria | 1 % |

Dentro de una rareza, todas las empresas tienen la misma probabilidad.

**Piedad (pity):** cada 20 carteras sin épica o legendaria, la siguiente garantiza épica o superior. Cada 90 sin legendaria, la siguiente garantiza legendaria. El contador se ve en pantalla.

### Duplicados = acciones

Cada vez que sale una empresa que ya tienes, ganas **una acción** más. Los ingresos de la empresa se multiplican por el número de acciones, con bonus en hitos:

| Acciones | Multiplicador extra |
|---|---|
| 10 | ×2 |
| 25 | ×2 |
| 50 | ×2 |
| 100 | ×3 |

Los hitos se acumulan (a 100 acciones: ×24).

## 5. Economía

### Ingresos por empresa

```
base(empresa) = 0,05 × (capitalización_USD / 1e9)^0,75     capital por segundo
ingresos(empresa) = base × acciones × bonus_hitos × factor_mercado
```

Ejemplos: una empresa de 10 000 M produce 0,28/s; una de 100 000 M, 1,6/s; una de 1 T, 8,9/s; una de 3 T, 20/s. Una legendaria vale unas 70 veces más que una común, sin que la común sea inútil.

**Factor de mercado (fase 2):** `1 + variación_diaria_real × 5`, acotado entre 0,5 y 1,5. Si Apple subió un 2 % ayer, hoy produce un 10 % más. Se actualiza una vez al día desde el servidor. Hasta la fase 2 vale 1.

### Ingresos totales

```
ingresos/s = Σ ingresos(empresa) × multiplicador_sets × multiplicador_prestigio
```

### Acción manual

El botón **Operar** da el equivalente a 5 segundos de ingresos pasivos (mínimo 1). Sirve para que la primera sesión no sea esperar.

### Progreso offline

Al volver se abonan los ingresos del tiempo ausente al 50 %, hasta un máximo de 8 horas. Las mejoras de prestigio podrán ampliar el tope y el porcentaje.

### Números grandes

La fase 1 usa números nativos de JavaScript. Cuando entren prestigio y multiplicadores encadenados se migrará a `break_eternity.js`. Todas las fórmulas viven en `src/game/economy.ts` para que la migración sea un cambio local.

## 6. Sets

Completar un conjunto da un multiplicador global permanente mientras se mantenga. El bonus parcial es proporcional al cuadrado del porcentaje completado, para que el último tramo sea el que más pesa.

| Set | Tamaño | Bonus al completar |
|---|---|---|
| Dow Jones 30 | 30 | +25 % |
| IBEX 35 | 35 | +25 % |
| DAX 40 | 40 | +25 % |
| Euro Stoxx 50 | 50 | +30 % |
| Nasdaq-100 | 100 | +40 % |
| Reino Unido Top 20 | 20 | +15 % |
| Asia y Oriente Medio | 24 | +20 % |

Fase 2: sets por **sector** (5 empresas de un mismo sector: +5 % a ese sector) y por **país**. Fase 3: sets temáticos de temporada ("las siete magníficas", "bancos europeos", "petroleras").

## 7. El mercado real en el juego (fase 2 y 3)

- **Cierre diario.** Un trabajo programado en el servidor descarga el cierre de cada empresa una vez al día y calcula el factor de mercado. El cliente nunca llama a la API de datos.
- **Dividendos.** En la fecha ex-dividendo real, la empresa paga un bonus equivalente a 1 hora de sus ingresos por cada acción.
- **Temporada de resultados.** Durante las semanas de presentación de resultados (enero, abril, julio, octubre), las empresas que presentan ese día producen ×2 durante 24 horas.
- **Splits.** Un split real duplica las acciones de los dueños. Es un regalo y una noticia.
- **Predicción diaria.** Elige tres empresas de tu colección y apuesta si suben o bajan. Acertar da capital; fallar no quita nada. Se resuelve con el cierre real.

## 8. Prestigio: fusiones y holdings

Cuando los ingresos se estancan, el jugador puede **fusionar** dos empresas del mismo sector con al menos 25 acciones cada una. Se crea un **holding** con nombre elegido por el jugador, que:

- da un multiplicador permanente al sector (+10 % por fusión, acumulable),
- sobrevive al reinicio de la colección,
- aparece en el perfil público del jugador.

Tras una fusión, la colección y el capital se reinician (prestigio clásico) pero se conservan holdings, logros, cosméticos y los hitos de sets alcanzados a modo de "memoria". Se valorará un reinicio parcial si las pruebas muestran que perderlo todo expulsa jugadores.

## 9. Competición (fase 2 y 3)

- **Ranking mundial** por valor de cartera (capital + valoración de la colección). Validado en servidor.
- **Ligas semanales** por divisiones (Bronce, Plata, Oro, Platino, Diamante) de 30 jugadores. Los 7 primeros ascienden, los 5 últimos descienden. Puntúa el capital ganado durante la semana, no el acumulado, para que los nuevos puedan competir.
- **Liga fantasy** (fase 3): alinea 5 empresas de tu colección el lunes; puntúas por su rendimiento real en la semana. Recompensas en carteras.
- **Gremios / fondos** (fase 3): grupos de hasta 30 jugadores con objetivos comunes semanales y un ranking de fondos.
- **Mercado entre jugadores:** solo a partir de la fase 4 y con impuesto, porque rompe economías si entra pronto.

## 10. Monetización

Orden de prioridad:

1. **Cosméticos:** marcos de carta, fondos de perfil, nombres de holding con estilo, animaciones de apertura.
2. **Pase de temporada** (cada 3 meses): recompensas por progreso, cosméticos exclusivos.
3. **Aceleradores de tiempo** (saltar 1 h de ingresos) con tope diario.
4. **Afiliación con brókers** y contenido educativo patrocinado, siempre señalizado.
5. **Tiradas de pago:** solo si el marco legal lo permite con claridad, con probabilidades publicadas, límite de gasto y verificación de edad. No está en el plan de los primeros 12 meses.

Nunca: vender ventaja en el ranking, mercado de cartas con dinero real, criptoactivos.

## 11. Experiencia y arte

- **Idiomas:** español e inglés desde la fase 2. Las claves de texto se separan desde el principio.
- **Estilo (v0.2, 15-oct-2026):** fondo blanco puro, marca frambuesa (OKLCH 0,56 / 0,22 / 353°), tipografía Bricolage Grotesque para texto y JetBrains Mono para cifras. Cartas verticales 5:7 con marco de color por rareza y lámina animada solo en las legendarias. Nada de logos ni emojis: el arte de cada carta es una **silueta de gráfico generada a partir del ticker** (determinista, única por empresa) coloreada por sector, con ticker grande, nombre y código de país. Las no descubiertas se muestran como silueta en gris con "???".
- **Apertura de cartera:** la cartera es una carta boca abajo con el dorso de la marca; al abrirla se voltea (menos de 0,8 s) y muestra la empresa. Sin modales: el progreso offline se avisa con un banner bajo la cabecera.
- **Accesibilidad:** contraste AA, modo reducido de animaciones, teclado en toda la interfaz.
- **Móvil primero** en el diseño de la colección: cuadrícula de 2 columnas en móvil, 4 a 6 en escritorio.

## 12. Técnica

- **Cliente:** Vite, React 19, TypeScript, Zustand (estado + persistencia local), Tailwind 4.
- **Servidor (fase 2):** Supabase: autenticación, Postgres, Edge Functions y tareas programadas. Despliegue del cliente en Cloudflare Pages o Vercel.
- **Datos:** Twelve Data (800 peticiones/día en gratuito) para cierres diarios; Finnhub para perfiles y noticias. Confirmar límites y licencia de uso en cada web antes de la fase 2.
- **Anti-trampas:** el servidor recalcula los ingresos a partir de la colección y el tiempo transcurrido; el cliente solo envía eventos (tirada, fusión) con marca de tiempo. Un progreso imposible se marca y no entra en el ranking.
- **Guardado:** local en fase 1 (localStorage, versión del esquema incluida); en nube desde la fase 2 con resolución de conflictos por marca de tiempo.
- **Datos de empresas:** `data/empresas.xlsx` es la fuente editable; `scripts/build_data.py` genera el JSON del cliente.

## 13. Métricas de éxito

| Fase | Métrica | Objetivo |
|---|---|---|
| 1 | Retención día 7 entre 20 probadores | 50 % |
| 2 | Usuarios registrados tras publicar en r/incremental_games e itch.io | 500 |
| 2 | Retención día 7 | 25 % |
| 3 | Retención día 30 | 10 % |
| 3 | Conversión a pago | 2 % |

## 14. Preguntas abiertas

- ¿Reinicio total o parcial en el prestigio? Decidir con pruebas de la fase 1.
- ¿Las empresas de Asia con ADR se tratan por su cotización local o por el ADR? Afecta a la moneda y al factor de mercado.
- ¿Cómo se gestiona una empresa que cambia de índice a mitad de temporada? Propuesta: los índices se congelan por temporada.
- ¿Nombre definitivo? Candidatos: CapitalDex, Tickr, Portfolio Legends, Bolsa Gacha. Comprobar dominio y marca antes de la fase 2.
