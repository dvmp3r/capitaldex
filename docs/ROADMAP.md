# Roadmap

Plazos orientativos para una persona a tiempo parcial con ayuda de Claude. Cada fase termina con un criterio de éxito medible; si no se cumple, se ajusta antes de pasar a la siguiente.

## Fase 0 — Diseño (2 semanas) · en curso

- [x] Investigación de mercado y referencias (15-oct-2026)
- [x] Documento de diseño v0.1 (`docs/GDD.md`)
- [x] Universo inicial de ~300 empresas con datos reales (`data/empresas.xlsx`)
- [x] Esqueleto del cliente con el bucle básico jugable
- [x] Revisar reparto de rarezas con los datos reales y ajustar umbrales (15-oct-2026: 3/7/21/38/31 %)
- [ ] Elegir nombre: comprobar dominio (.com / .io / .es) y marca en EUIPO y USPTO. **Decisión del autor.** Consulta RDAP del 15-oct-2026: `capitaldex.com` y `portfoliolegends.com` registrados; `capitaldex.io`, `capitaldex.app`, `capitaldex.net`, `tickr.io` y `bolsagacha.com` libres; los `.es` no se pueden consultar por RDAP (mirar en dominios.es).
- [ ] Landing con lista de espera (una página estática + formulario)
- [ ] Cuenta gratuita en Twelve Data y Finnhub; confirmar límites y licencia

**Criterio de éxito:** fórmula de rareza y de ingresos que convenzan con datos reales.

## Fase 1 — MVP de un jugador (6 semanas)

- [x] Gacha con probabilidades visibles y piedad (15-oct-2026)
- [x] Colección con filtros (rareza, índice, sector, país) y buscador (15-oct-2026)
- [x] Duplicados como acciones con hitos (15-oct-2026)
- [x] Sets por índice con bonus (15-oct-2026)
- [x] Botón Operar y progreso offline (15-oct-2026)
- [x] Guardado local versionado, exportar e importar partida (15-oct-2026)
- [x] Ajustes: sonido (sintetizado, sin archivos) y animaciones reducidas (15-oct-2026)
- [x] Idioma preparado: textos en `src/i18n/es.ts` con `t()` tipado (15-oct-2026). Pendiente para la fase 2: nombres de sector y de país vienen de los datos, habrá que darles clave también.
- [x] Animación de apertura con variante legendaria (15-oct-2026)
- [x] Máquina de cápsulas: el color de la cápsula anuncia la rareza; sonidos por fase (15-oct-2026)
- [x] Introducción a toda pantalla para la primera vez, con las tres carteras gratis (15-oct-2026)
- [x] Tema oscuro definitivo y máquina v2 con animaciones por fases (Web Animations API) (15-oct-2026)
- [x] Máquina v3 en 3D con three.js y física propia de las cápsulas; la cápsula cae con el color de la rareza (15-oct-2026)
- [x] Cargar la escena 3D bajo demanda (code splitting) (15-oct-2026)
- [x] Bucle idle: titulares (mejoras permanentes por sector, región, rareza, globales, bróker, mesa y noticias) y noticias de última hora temporales (15-oct-2026)
- [x] Universo ampliado a 1 117 empresas con los índices completos de 12 mercados; colección paginada (15-oct-2026)
- [x] Máquina de bolas con ilustración CC0 de Openclipart (cuerpo rojo clásico) y bolas con física propia; manivela animada y cápsula de la rareza saliendo por la boca (15-oct-2026)
- [x] Máquina en 3D estilizado con three.js (sin reflejos ni refracción, barata), según las referencias de Jorge: caja gashapon roja con vitrina cuadrada, placa cromada con mando grande y boca en arco debajo, cápsulas de dos mitades (color de la rareza + transparente) con física; la cápsula sale por la boca y cae a la bandeja del pie, donde se abre. La ilustración 2D queda como respaldo sin WebGL (15-oct-2026)
- [x] Sonidos por acción y rareza: clic de Operar, caja registradora al comprar titular, alerta y acierto de noticia, arpegio de hito, fanfarria legendaria (15-oct-2026)
- [ ] Añadir Nikkei 225 e Ibovespa (Wikipedia no tiene tabla de componentes; buscar otra fuente)
- [ ] Validar partidas en el servidor para que el ranking no se pueda inflar desde el navegador
- [x] Logros con recompensas: 30 logros (carteras, rarezas, empresas, acciones, sectores, países, índices, titulares, noticias, clics, capital) con capital, carteras gratis o multiplicador permanente; pestaña Logros (15-oct-2026)
- [x] Gestor automático: serie de titulares que abre una cartera sola cada 5 min → 32 s en el nivel 10, si hay capital (15-oct-2026)
- [x] Pasada de "juice": oro como color del dinero, capital suavizado, números flotantes al operar, avisos de hitos, confeti en legendarias, halo en cartas nuevas, fondo con luz (15-oct-2026)
- [x] Carta del color de su rareza (el gráfico ya no usa el color del sector, que confundía con el tier); revelado con ceremonia creciente por rareza: halo, chispas, rayos giratorios y subida distinta para épicas y legendarias (15-oct-2026)
- [x] Logros con progreso visible (anillo, barra, "siguiente objetivo") y Mercado en tarjetas con filtros por grupo; índices como filtro desplegable de la colección; "Solo mías" activo por defecto (15-oct-2026)
- [x] Física de las bolas reescrita: dinámica por posiciones con paso fijo, cuatro pasadas, fricción y sueño (sin vibración ni solapes); manivela con dos golpes del plato agitador; bolas mates; pie pequeño con patas y bandeja aparte; decoración (cartel en la vitrina, flechas del mando, placa de precio, banda) (15-oct-2026)
- [x] Operar con órdenes limitadas (10, una cada 10 s, 3 s de ingresos por orden): el juego manual ya no genera capital ilimitado (15-oct-2026)
- [ ] Reequilibrar costes de titulares con datos de juego reales (ahora son fijos, pensados para la curva de las primeras 200 carteras)
- [x] Tutorial de 3 tiradas gratis: pistas contextuales en las primeras carteras (15-oct-2026)
- [x] Pantalla de estadísticas (tiradas, tiempo jugado, mejor tirada) (15-oct-2026)
- [x] Despliegue en GitHub Pages con el dominio kaminarishop.store, automático en cada push a `main` (15-oct-2026)
- [ ] Pruebas con 20 personas durante 2 semanas; encuesta corta

**Criterio de éxito:** la mitad de los probadores vuelve al séptimo día.

## Fase 2 — Online (6 semanas)

- [x] Supabase: cuentas con usuario y contraseña, guardado en la nube (fusión: gana la partida con más capital generado), esquema en `supabase/schema.sql` (15-oct-2026)
- [ ] Tarea diaria en servidor que descarga cierres y calcula el factor de mercado
- [x] Ranking mundial por capital generado (vista pública `leaderboard`) (15-oct-2026). Pendiente: validación en servidor contra trampas
- [ ] Ligas semanales por divisiones
- [ ] Prestigio: fusiones y holdings
- [ ] Sets por sector y país
- [ ] Inglés
- [ ] Servidor de Discord y página de novedades
- [ ] Lanzamiento en itch.io y publicación en r/incremental_games

**Criterio de éxito:** 500 registros y retención día 7 del 25 %.

**Estado 15-oct-2026:** web publicada en kaminarishop.store (GitHub Pages), cuentas y ranking operativos con Supabase. Falta HTTPS obligatorio (certificado en emisión), inglés, prestigio y las pruebas con jugadores.

## Fase 3 — Mercado vivo y monetización (8 semanas)

- [ ] Dividendos y temporada de resultados con fechas reales
- [ ] Predicción diaria
- [ ] Liga fantasy semanal
- [ ] Gremios / fondos
- [ ] Logros y pase de temporada
- [ ] Tienda de cosméticos (Stripe)
- [ ] PWA instalable con notificaciones
- [ ] Términos, privacidad y cookies revisados por un abogado
- [ ] Primera temporada con rareza recalculada

**Criterio de éxito:** retención día 30 del 10 % y primeros ingresos.

## Fase 4 — Expansión (continuo)

- [ ] Steam mediante Tauri
- [ ] Android e iOS mediante Capacitor
- [ ] Más idiomas (portugués, alemán, francés)
- [ ] Mercado entre jugadores con impuesto
- [ ] Modo educativo para centros (aulas privadas con ranking propio)
- [ ] Decidir si se constituye una sociedad para el juego

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Logos y marcas | Sin logos; arte propio; aviso de no afiliación; revisión legal antes de la fase 3 |
| Regulación de cajas de botín | Gacha solo con moneda ganada jugando; probabilidades públicas; nada de pago por tiradas en 12 meses |
| Límites o cambio de licencia de las API de datos | Cache diaria en servidor; dos proveedores; el juego funciona sin datos del día |
| Trampas en el ranking | Validación en servidor desde la fase 2 |
| Economía rota (inflación) | Constantes en un solo archivo; telemetría anónima de progreso desde la fase 1 |
| Abandono del proyecto por tamaño | Fases cortas con criterio de éxito; publicar pronto |
