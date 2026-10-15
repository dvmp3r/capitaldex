# Roadmap

Plazos orientativos para una persona a tiempo parcial con ayuda de Claude. Cada fase termina con un criterio de éxito medible; si no se cumple, se ajusta antes de pasar a la siguiente.

## Fase 0 — Diseño (2 semanas) · en curso

- [x] Investigación de mercado y referencias (15-oct-2026)
- [x] Documento de diseño v0.1 (`docs/GDD.md`)
- [x] Universo inicial de ~300 empresas con datos reales (`data/empresas.xlsx`)
- [x] Esqueleto del cliente con el bucle básico jugable
- [x] Revisar reparto de rarezas con los datos reales y ajustar umbrales (15-oct-2026: 3/7/21/38/31 %)
- [ ] Elegir nombre: comprobar dominio (.com / .io / .es) y marca en EUIPO y USPTO. **Decisión de Jorge.** Consulta RDAP del 15-oct-2026: `capitaldex.com` y `portfoliolegends.com` registrados; `capitaldex.io`, `capitaldex.app`, `capitaldex.net`, `tickr.io` y `bolsagacha.com` libres; los `.es` no se pueden consultar por RDAP (mirar en dominios.es).
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
- [x] Tutorial de 3 tiradas gratis: pistas contextuales en las primeras carteras (15-oct-2026)
- [x] Pantalla de estadísticas (tiradas, tiempo jugado, mejor tirada) (15-oct-2026)
- [ ] Despliegue en Cloudflare Pages con dominio provisional
- [ ] Pruebas con 20 personas durante 2 semanas; encuesta corta

**Criterio de éxito:** la mitad de los probadores vuelve al séptimo día.

## Fase 2 — Online (6 semanas)

- [ ] Supabase: cuentas (correo y Google), guardado en nube, perfil público
- [ ] Tarea diaria en servidor que descarga cierres y calcula el factor de mercado
- [ ] Ranking mundial validado en servidor
- [ ] Ligas semanales por divisiones
- [ ] Prestigio: fusiones y holdings
- [ ] Sets por sector y país
- [ ] Inglés
- [ ] Servidor de Discord y página de novedades
- [ ] Lanzamiento en itch.io y publicación en r/incremental_games

**Criterio de éxito:** 500 registros y retención día 7 del 25 %.

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
