# Aqua View: TON y USDT en TON

El servidor utiliza cuentas oficiales separadas. Los jugadores empiezan con cero VIEW, cero CASH y ningún pez. El estado anterior de prueba queda archivado en `players.state`; la partida oficial vive en `players.official_state`. No se convierte saldo de prueba en dinero real. La recompensa diaria sigue siendo de 300 VIEW.

## Activación en el servicio web de Render

1. Desplegar el último commit: **Manual Deploy → Deploy latest commit**.
2. Entrar desde Telegram y abrir **Billetera**. Copiar el ID numérico mostrado.
3. En **Environment**, configurar `ADMIN_TELEGRAM_ID` con ese ID y `PAYMENTS_ENABLED=true`. Guardar y desplegar.
4. Opcional: configurar `TONAPI_KEY` desde https://tonconsole.com para aumentar los límites de lectura de blockchain. No compartir claves privadas ni frases de recuperación.
5. Consultar `/api/config`: debe indicar `official:true` y `paymentsEnabled:true`. Probar una recarga mínima y comprobar la acreditación antes de anunciar la apertura.

El código no cambia variables del servicio existente ni puede confirmar pagos sin una transferencia real. La activación requiere los pasos anteriores. La conexión pública de TonAPI fue consultada durante el desarrollo; su disponibilidad en Render y un pago real deben comprobarse tras desplegar.

## Depósitos

Dirección receptora de mainnet:
`UQAGxytQ9Fk1yo8N7ilb_AL39wsmeTOehefvVCpfDf4oA1Mt`

- TON, mostrado como TON (Gram): mínimo 0.1; 1 TON = 13,000 VIEW.
- USDT en TON: mínimo 1; 1 USDT = 10,000 VIEW. Sin bono automático.
- USDT master de Tether: `EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`.

Crear un pedido, enviar su importe exacto con el comentario `AquaView:<uuid>`, esperar al menos 30 segundos e introducir el hash hexadecimal de la transacción para verificar. El pedido permanece en el historial. No enviar sin comentario, ni usar BEP-20/TRC-20. Pagar las comisiones de red aparte. La comprobación exige evento terminado, éxito de las transacciones base, recepción confirmada, comentario único, importe exacto, dirección receptora y contrato oficial de USDT. Un recibo solo puede utilizarse una vez. Los errores del proveedor no acreditan saldo.

## Retiros manuales

Solo el CASH oficial recogido puede retirarse. 13,000 CASH = 1 TON, mínimo solicitado 0.1 TON. 10,000 CASH = 1 USDT, mínimo solicitado 1 USDT. Comisión 5% del importe solicitado: 0.1 TON entrega 0.095 TON; 1 USDT entrega 0.95 USDT. La comisión se redondea hacia arriba a la unidad mínima de la moneda. Los usuarios ven solicitudes pendientes, pagadas o rechazadas y CASH reservado.

La cuenta indicada en `ADMIN_TELEGRAM_ID` verá administración dentro de Billetera. Enviar manualmente desde la billetera receptora la cantidad neta exacta a la dirección indicada, usando el comentario `AquaView:withdraw:<uuid>`. Pegar el hash y comprobar pago. El estado pagado requiere prueba blockchain de origen, destino, moneda, comentario e importe. Las claves de la billetera permanecen fuera del servidor. No existe envío automático.

Rechazar únicamente antes de enviar: la devolución libera CASH una sola vez. Un retiro pagado no puede rechazarse. Mantener fondos suficientes en ambas monedas y TON para las comisiones. No usar otra billetera de envío: la prueba exige origen igual a la billetera oficial.

## Operación

Las modificaciones monetarias y sus recibos se guardan en PostgreSQL con bloqueos, claves únicas y registro contable. El bot valida los datos firmados de Telegram. El cliente no puede crear peces, ganancias ni acreditaciones arbitrarias. `PAYMENTS_ENABLED=false` detiene nuevas recargas, verificaciones y solicitudes; el historial permanece disponible.

No borrar ni sustituir la base de datos. La base gratuita de Render tiene un plazo de 30 días: migrarla o mejorar el plan antes de su vencimiento, conservando los registros. Los cobros de bienes digitales mediante criptomonedas dentro de Telegram pueden entrar en conflicto con sus condiciones de Stars; la configuración técnica no constituye aprobación de Telegram.

Fuentes: https://docs.tonapi.io/tonapi/rest-api ; https://tether.to/en/supported-protocols/ ; https://core.telegram.org/bots/payments-stars
