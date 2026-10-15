# Roadmap

Plazos orientativos para una persona a tiempo parcial con ayuda de Claude. Cada fase termina con un criterio de éxito medible; si no se cumple, se ajusta antes de pasar a la siguiente.

## Fase 0 — Diseño (2 semanas) · en curso

- [x] Investigación de mercado y referencias (15-oct-2026)
- [x] Documento de diseño v0.1 (`docs/GDD.md`)
- [x] Universo inicial de ~300 empresas con datos reales (`data/empresas.xlsx`)
- [x] Esqueleto del cliente con el bucle básico jugable
- [ ] Revisar reparto de rarezas con los datos reales y ajustar umbrales
- [ ] Elegir nombre: comprobar dominio (.com / .io / .es) y marca en EUIPO y USPTO
- [ ] Landing con lista de espera (una página estática + formulario)
- [ ] Cuenta gratuita en Twelve Data y Finnhub; confirmar límites y licencia

**Criterio de éxito:** fórmula de rareza y de ingresos que convenzan con datos reales.

## Fase 1 — MVP de un jugador (6 semanas)

- [ ] Gacha con probabilidades visibles y piedad
- [ ] Colección con filtros (rareza, índice, sector, país) y buscador
- [ ] Duplicados como acciones con hitos
- [ ] Sets por índice con bonus
- [ ] Botón Operar y progreso offline
- [ ] Guardado local versionado, exportar e importar partida
- [ ] Ajustes: sonido, animaciones reducidas, idioma preparado
- [ ] Animación de apertura con variante legendaria
- [ ] Tutorial de 3 tiradas gratis
- [ ] Pantalla de estadísticas (tiradas, tiempo jugado, mejor tirada)
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
