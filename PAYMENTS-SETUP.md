# Preparación de pagos oficiales

Estado: **base contable implementada y probada; pagos y transferencias reales todavía desconectados**. Ningún saldo de la demo se convierte en saldo de dinero real.

## Cobros de VIEW

Telegram exige Stars (`XTR`) para vender monedas y artículos digitales dentro de bots y Mini Apps. La recarga propuesta originalmente en TON/USDT debe revisarse antes de conectarla. Fuente oficial: https://core.telegram.org/bots/payments-stars

Falta definir los paquetes y el precio en Stars. Después se conectará la creación de facturas, un webhook autenticado, la comprobación del importe y comprador, `successful_payment`, soporte y reembolsos. Un cierre de la factura en el navegador no acredita VIEW. La función interna `recordVerifiedPayment` debe recibir exclusivamente recibos que el servidor haya autenticado; todavía no está expuesta mediante ninguna API.

`server/finance.js` registra pedidos y recibos con identificadores únicos para impedir acreditaciones repetidas. Guarda cuentas oficiales en tablas separadas de `players.state`, con saldo inicial real de cero. No consulta ni importa el CASH o los VIEW de prueba. La conexión del juego a esta economía aún está pendiente.

## Retiros

El registro calcula con enteros: 13.000 CASH = 1 TON, mínimo 0,1 TON; 10.000 CASH = 1 USDT en TON, mínimo 1 USDT. La comisión es 5% del importe solicitado, descontada del pago. Por ejemplo, 1 USDT solicitado paga 0,95 USDT. TON es el nombre de la moneda nativa; la etiqueta GRAM anterior necesita corregirse en la interfaz oficial.

Las solicitudes reservan el CASH real en una transacción. Un reintento no vuelve a descontarlo. Rechazar una solicitud devuelve la reserva una sola vez. Se comprueba la dirección TON, su checksum y que corresponda a mainnet. Esta comprobación es del formato; no demuestra que exista una billetera ni verifica transferencias en blockchain.

Falta seleccionar cómo se enviarán los retiros: manualmente desde la billetera del propietario, o mediante un proveedor de pagos conectado al servidor. La dirección receptora pública no permite firmar retiros. No introducir una frase semilla o clave privada en GitHub o en mensajes. Ninguna solicitud se marca como pagada y este módulo no envía fondos.

## Datos pendientes para la conexión

- Paquetes: cuántos VIEW recibe el jugador por cada cantidad de Stars.
- Método de envío de retiros y acceso administrativo del propietario.
- Fondos propios disponibles para cubrir las recompensas; los peces no generan criptomonedas en la billetera.

La base de datos gratuita de Render caduca a los 30 días. El registro de pagos necesita almacenamiento persistente y copias de seguridad antes de admitir dinero real. Fuente: https://render.com/docs/free

No se han cambiado las variables ni activado pagos en Render. La economía de prueba sigue funcionando.
