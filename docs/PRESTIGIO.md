# Objetivo y prestigio — propuesta de diseño (15-oct-2026)

Problema: hoy el juego no tiene un objetivo visible ni un bucle a medio plazo. Se abre carteras, se compran titulares y ya. Esta propuesta recoge lo que hacen los idle de referencia y lo adapta a CapitalDex. Pendiente de que Jorge elija.

## Qué hacen los idle que funcionan

- **Cookie Clicker (Ascensión / Heavenly Chips):** la moneda de prestigio sale de las galletas de toda la vida: `chips = ∛(total / 10¹²)`. Para duplicar chips hay que generar unas 8 veces más que en la run anterior. Cada chip da un bono permanente y se gastan en una pantalla de mejoras celestiales.
- **AdVenture Capitalist (Angel Investors):** `ángeles = 150·√(total / 10¹⁵)`. Cada ángel da +2 % de ingresos; se gastan en mejoras permanentes.
- **Egg, Inc. (Prestige / Soul Eggs):** moneda = ganancias de la run actual elevadas a ~1/7. Runs cortas y repetidas.
- **Antimatter Dimensions:** varias capas de prestigio (Infinity, Eternity, Reality). Cada capa no solo da un número más grande: **desbloquea un sistema nuevo**. Por eso aguanta cientos de horas.
- **Realm Grinder:** la moneda depende del máximo alcanzado, con facciones que cambian la estrategia de cada run.

Reglas que se repiten en los análisis de diseño:

1. El prestigio tiene que sentirse como **aceleración, no castigo**: la siguiente run debe notarse más rápida en los primeros 30 segundos.
2. El primer prestigio debe llegar en **10 a 20 minutos**; quien se va antes nunca ve el juego de verdad.
3. Cada mejora buena **cambia cómo se juega**, no solo sube un número (clic → automático).
4. Hace falta **un final visible** ("completar la colección") y un punto de decisión claro a medio plazo (prestigiar).
5. Mostrar pocas cosas a la vez: las 2 o 3 siguientes mejoras, no 20.

## El objetivo de CapitalDex

**Completar la colección: las 1 117 empresas.** Es imposible en una sola run (sin piedad, 0,3 % de legendaria), y ese es el punto: la colección es **permanente** y se completa a lo largo de varios prestigios.

- La colección pasa a tener dos estados por empresa: **descubierta** (alguna vez salió en una cartera; se conserva para siempre, como una Pokédex) y **en cartera** (acciones en la run actual; se pierden al prestigiar).
- En la cabecera, siempre visible: `Colección 85/1117` con barra, y el **siguiente objetivo** (próximo logro, índice a punto de completarse o el prestigio disponible).
- Objetivos intermedios ya existentes: completar índices, logros, hitos de acciones. Se añaden **3 objetivos de run** rotativos ("consigue 2 raras de Energía", "completa el IBEX", "aprovecha 5 noticias") con premio en influencia.

## Prestigio: "Fundar un holding"

Cuando la run se estanca, el jugador funda un holding: se queda con la **influencia** ganada y vuelve a empezar más fuerte.

### Moneda: influencia

- `influencia_total = ⌊(capital_generado_total / 10⁷)^0,4⌋`, se calcula sobre lo generado en todas las runs. Al prestigiar se cobra la diferencia con lo que ya se tenía.
- Orientación: 10 M generados → 1; 100 M → 2; 1 000 M → 6; 10 000 M → 15; 100 000 M → 39; 1 B → 100. Se ajusta con datos de juego reales.
- El botón "Fundar holding" aparece cuando la ganancia es ≥ 1 y muestra siempre "+N influencia". Regla orientativa para el jugador: prestigia cuando puedas más o menos duplicar tu influencia.
- Cada punto de influencia da **+2 % de ingresos permanente** aunque no se gaste (como los ángeles de AdVenture Capitalist), para que prestigiar nunca sea un error.

### Qué se pierde y qué se conserva

| Se pierde | Se conserva |
|---|---|
| Capital, acciones en cartera, niveles de titulares, impulsos, carteras gratis, órdenes, rachas de la gacha | Empresas **descubiertas**, logros (y su multiplicador), estadísticas, influencia y mejoras del holding, ajustes, cuenta |

### Pantalla del holding (al prestigiar)

Al pulsar "Fundar holding" (confirmación en dos pasos, como el reinicio): pantalla a toda página, estética de consejo de administración, con el resumen de la run (duración, generado, descubiertas nuevas, mejor tirada), la influencia ganada y la **tienda de mejoras permanentes**. Se cierra con "Empezar la run N".

Mejoras permanentes (coste en influencia, varios niveles, cada nivel más caro):

| Mejora | Efecto | Cambia la forma de jugar |
|---|---|---|
| **Capital semilla** | Empezar cada run con capital (1 k → 1 M) | Las primeras compras son inmediatas |
| **Agenda de contactos** | Carteras gratis al empezar (3 → 30) | La run arranca con colección |
| **Ojo clínico** | Probabilidad de épica y legendaria ×1,25 por nivel (hasta ×3) | La vía para acabar la colección |
| **Radar de novedades** | X % de las carteras evitan empresas ya descubiertas | Idem; acelera la Pokédex |
| **Gestor de confianza** | El gestor automático empieza desbloqueado y con nivel | Automatización desde el minuto 1 |
| **Memoria del mercado** | Conservar N niveles de cada serie de titulares | Menos repetición de lo ya hecho |
| **Cartera blindada** | Elegir N empresas que sobreviven al prestigio | Decisión estratégica antes de prestigiar |
| **Prensa amiga** | Noticias más frecuentes y largas desde el inicio | Más momentos de acción |
| **Dividendo del holding** | +X % offline y tope mayor | Vuelve mejor cada día |
| **Mesa ampliada** | Órdenes máximas 10 → 25 | Más juego manual para quien lo quiera |

### Capas por nivel de holding

Cada holding fundado (1.º, 2.º, 3.º…) desbloquea algo nuevo, no solo multiplicadores:

- **Holding 1:** sets por sector y por país; objetivos de run.
- **Holding 2:** noticias de nivel 2 (eventos de 60 s que afectan a un sector entero).
- **Holding 3:** cartera blindada y radar.
- **Holding 5:** temporadas y ligas (necesitan la validación en el servidor).

### Ranking con sentido

Varias tablas en lugar de una: **colección descubierta (%)**, **influencia total**, **holdings fundados**, **capital de temporada** (se reinicia cada 4 a 6 semanas) y **velocidad** (tiempo hasta el primer holding). Así no gana solo el que lleva más horas.

## Ritmo objetivo de la primera run

| Momento | Hoy | Objetivo |
|---|---|---|
| Primera decisión (comprar titular) | ~1 min | < 1 min |
| Primera automatización (gestor) | 50 carteras (~15 min) | ~3 min (requisito 12 carteras, nivel 1 cada 60 s) |
| Primer prestigio | no existe | 15 a 20 min |
| Primer índice completo | horas | primera hora, con Radar |

## Orden de implementación propuesto

1. Colección permanente (descubiertas vs en cartera) y objetivo visible en la cabecera.
2. Influencia y botón "Fundar holding" con la pantalla de resumen + tienda (5 mejoras iniciales: semilla, contactos, ojo clínico, gestor, memoria).
3. Objetivos de run (3 rotativos).
4. Capas por holding y tablas de ranking.
5. Reajuste de ritmo con datos (tiempo hasta primer prestigio).
