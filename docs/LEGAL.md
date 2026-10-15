# Notas legales y de cumplimiento

Esto no es asesoramiento jurídico. Es la lista de lo que hay que resolver y la decisión provisional de diseño para cada punto. Antes de monetizar (fase 3) hay que pasarlo por un abogado especializado en videojuegos y propiedad intelectual.

## 1. Nombres de empresas y tickers

- Usar el nombre de una empresa real para identificarla es, en general, un **uso nominativo** defendible, y es lo que hacen todos los simuladores de bolsa (Investopedia, MarketWatch, Invstr, Comish).
- Condiciones: usar solo lo necesario para identificarla, no sugerir patrocinio ni relación, y no usar el nombre como marca del juego.
- **Decisión:** nombres y tickers en texto plano. Aviso visible en el pie y en la ficha de cada carta: *"CapitalDex no está afiliado ni respaldado por ninguna de las empresas que aparecen. Los datos son públicos y se muestran con fines informativos y de entretenimiento."*

## 2. Logos

- Un logo es un signo distintivo; mostrarlo en una carta coleccionable puede sugerir respaldo y es el riesgo real.
- **Decisión:** sin logos. Cada carta lleva ticker, nombre, bandera e icono de sector con arte propio. Si en el futuro se quieren logos, usar Logo.dev (plan gratuito con atribución para proyectos comerciales, uso bajo demanda, sin descarga masiva) y consultar antes.

## 3. Datos de mercado

- Los precios y fundamentales vienen de proveedores con sus propias licencias. Alpha Vantage gratuito es solo para uso no comercial. Twelve Data y Finnhub tienen planes gratuitos con límites; hay que leer sus términos de uso comercial.
- Los datos con retraso (cierre del día anterior) bastan para el juego y son mucho más baratos que el tiempo real.
- **Decisión:** cache diaria en servidor, nunca redistribuir los datos en bruto, mostrar "datos con retraso" en la interfaz. Antes de la fase 2, elegir proveedor y, si hace falta, contratar el plan básico (unos 10-30 € al mes).

## 4. Gacha y cajas de botín

- España tramita una ley orgánica de protección de menores en entornos digitales que prohibiría los mecanismos de recompensa aleatoria a menores. La UE prepara normativa en la misma línea (Digital Fairness Act). Países Bajos y Bélgica ya restringen las cajas de botín pagadas con dinero real.
- Un gacha que **solo se abre con moneda ganada jugando** no es una caja de botín de pago. Es la vía segura.
- **Decisión:** sin tiradas de pago al menos durante 12 meses. Probabilidades siempre visibles. Si algún día se venden tiradas: verificación de edad, límites de gasto, probabilidades publicadas y revisión legal por país.

## 5. Protección de datos (RGPD)

- Fase 1 sin cuentas: no se recoge ningún dato personal. La telemetría, si se añade, debe ser anónima y sin cookies de seguimiento.
- Fase 2 con cuentas: política de privacidad, base legal (ejecución del contrato), derecho de supresión, alojamiento en la UE (Supabase permite elegir región).
- Menores: pedir fecha de nacimiento al registrarse si hay cualquier función de pago.

## 6. Términos de uso

- Redactar para la fase 2: propiedad de la cuenta, conducta, trampas, moneda virtual sin valor real, no es asesoramiento financiero.
- Aviso obligatorio en toda pantalla de datos: *"Esto es un juego. Nada de lo que aparece es una recomendación de inversión."*

## 7. Patentes

- Existe una patente estadounidense de 2002 (US 6 497 410) sobre cartas coleccionables de empresas cotizadas. Por antigüedad debería haber expirado, pero conviene que el abogado lo confirme antes de la fase 3.

## 8. Marca del juego

- Antes de fijar el nombre: buscar en EUIPO (eSearch plus), OEPM y USPTO, y comprobar dominios y nombres de usuario en redes.
- Evitar nombres que evoquen marcas de otros juegos (nada de "-mon", "-dex" si se confunde con Pokédex; valorar el riesgo con el abogado).
