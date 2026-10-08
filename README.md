# Aqua View

Juego móvil de pesca para Telegram: río, lago, costa y océano, combate manteniendo el dedo, estanque con producción diaria y peces que viven seis meses. La cuenta oficial comienza con cero VIEW, cero CASH y sin peces. La recompensa diaria es 300 VIEW, una vez por día UTC.

## Servidor

Node.js 24 y PostgreSQL. Configurar `BOT_TOKEN`, `DATABASE_URL` y opcionalmente `APP_URL`. Ejecutar `npm ci` y `npm start`. Nunca colocar el token del bot ni claves privadas en archivos públicos.

Render usa `render.yaml`. En un servicio existente, desplegar manualmente el último commit y configurar las variables desde Environment. `/healthz` comprueba la base; `/api/config` informa si la cuenta oficial y los pagos están habilitados. Configurar la Main App y Menu Button de @AquaViewGameBot con la URL HTTPS del servidor.

## Depósitos y retiros

TON (Gram) y USDT exclusivamente en TON. Verificación blockchain, recibos únicos, cuenta contable independiente y retiros manuales con reserva de CASH y comisión 5%. La administración solo acepta la cuenta indicada en `ADMIN_TELEGRAM_ID`. `PAYMENTS_ENABLED=true` habilita las operaciones después de configurar ese ID. Sin él, la interfaz oficial está disponible pero los pagos permanecen deshabilitados.

Consultar [PAYMENTS-SETUP.md](PAYMENTS-SETUP.md) para instrucciones, tasas, comentario obligatorio de cada pedido y procedimiento de envío manual. El código no firma ni envía criptomonedas automáticamente. Comprobar una recarga y un retiro reales tras desplegar antes de anunciar la apertura.

Los saldos y peces de prueba permanecen archivados y no se convierten en dinero real. El juego oficial usa `official_state` y la cuenta contable PostgreSQL. GitHub Pages conserva una demo local independiente; usar la URL de Render en Telegram.

## Operación y validación

La API valida la firma y antigüedad de `Telegram.WebApp.initData`, almacena sesiones como hashes y decide la pesca y la economía en el servidor. El cliente solo envía acciones e interacción del dedo; no puede declarar capturas ni saldos. Los registros contables, reservas y recibos se actualizan mediante transacciones.

`npm test` comprueba economía, seis meses de vida, autenticación, cuentas independientes, persistencia, contabilidad y verificación blockchain con casos de rechazo y duplicados. No utiliza pagos reales para los tests.

La base gratuita de Render vence a los 30 días; migrar o mejorar su plan antes de la caducidad sin perder los datos. El servicio web gratuito puede dormir por inactividad. Documentación: https://render.com/docs/free

## Pruebas exclusivas del administrador

Solo el ID configurado en `ADMIN_TELEGRAM_ID` recibe el botón **Entrar en pruebas**. La partida separada comienza con exactamente 208,000 VIEW, sin peces, cebos ni CASH. Billetera permite reiniciar las pruebas a ese estado; no suma saldo. La versión anterior de las pruebas se reinicia una sola vez al abrir este modo tras actualizar. Comprar, pescar y recoger CASH en este modo solo modifica `admin_test_state`. No se transfieren VIEW, peces ni CASH a la partida oficial y no hay retiros de prueba. **Volver a cuenta oficial** recupera el estado oficial. El servidor rechaza las rutas de pruebas de cualquier otra cuenta, independientemente de lo que modifique el cliente.

## Tarea del grupo Aqua View

Tareas incluye el enlace https://t.me/+yglx16-VGRhkN2Vh y una recompensa única de 200 VIEW. Añadir @AquaViewGameBot como administrador de ese grupo y configurar `AQUA_GROUP_CHAT_ID` en Render con el ID numérico negativo del grupo (no el enlace de invitación ni el ID personal). El servidor usa getChatMember con la cuenta autenticada; solo acredita a miembros actuales, una vez por jugador. Solicitudes pendientes, miembros que salieron o fueron expulsados y errores de Telegram no reciben saldo. Sin configurar el ID se puede abrir el grupo pero no reclamar la recompensa. El modo de pruebas no muestra reclamación oficial. Documentación: https://core.telegram.org/bots/api#getchatmember

Para obtener el ID sin compartir el token, el administrador puede añadir el bot al grupo, escribir `/grupo@AquaViewGameBot` allí y abrir **Tareas → Explorar → Obtener ID del grupo**. Esta consulta de metadatos del bot es exclusiva del administrador, no envía mensajes ni confirma actualizaciones. Si existe un webhook o no hay actualizaciones recientes, introducir el ID del grupo manualmente.

## Referidos

El botón Invitar del lateral derecho abre una ventana flotante. Cada cuenta tiene un enlace de la Mini App. El servidor valida el `start_param` firmado por Telegram y vincula únicamente cuentas nuevas a un invitador existente; la vinculación no cambia después.

Se acumulan comisiones adicionales del 5%, 3% y 2% en tres niveles sobre el CASH que los jugadores recogen de sus peces. No se descuenta al jugador. Los depósitos, recompensas de tareas, cobros de comisiones y el modo de pruebas no generan comisiones. La atribución y acreditación se guardan en PostgreSQL dentro de la transacción de recogida, con referencias únicas para impedir duplicados.

A partir de 1.000 CASH de referidos se puede transferir todo el saldo disponible a la billetera oficial; luego se aplican las condiciones de retiro habituales. La ventana muestra jugadores y ganancias acumuladas por nivel, saldo disponible, total generado y botones para compartir o copiar el enlace. Requiere que Main App esté configurada en BotFather.
