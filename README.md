# Aqua View

Juego de pesca para Telegram: cuatro áreas, captura manteniendo el dedo, estanque con producción diaria y peces que viven seis meses. Monedas y recompensas de **prueba, sin valor monetario**. Depósitos y retiros siguen deshabilitados.

## Desplegar en Render

[Crear servidor y base de datos](https://render.com/deploy?repo=https://github.com/gavisoft2/laguna-pixel)

1. Inicia sesión en Render y conecta GitHub si se solicita. El Blueprint `render.yaml` crea `aqua-view` y `aqua-view-db`.
2. En `BOT_TOKEN`, pega el token de **@AquaViewGameBot** obtenido en BotFather. Introdúcelo únicamente en Render; nunca en el código, GitHub, capturas ni mensajes. `DATABASE_URL` se conecta automáticamente a la base de datos.
3. Confirma el despliegue. Espera a que el servicio muestre **Live**. Copia su URL HTTPS real; Render puede añadir un sufijo al nombre.
4. Comprueba `<URL>/healthz`: debe devolver `{"ok":true}`. `<URL>/api/config` debe indicar `online: true` y `paymentsEnabled: false`.
5. En BotFather → Aqua View → Mini Apps, cambia **Main App** y **Menu Button** a esa misma URL. Conserva la restricción de mismo origen. Ambas configuraciones deben apuntar al servidor, no a GitHub Pages.
6. Cierra y abre de nuevo el juego desde Telegram. Verás **PRUEBA ONLINE · SIN PAGOS REALES** después de entrar.
7. Compra un cebo, reclama la recompensa diaria y pesca. Cierra y vuelve a abrir; comprueba los mismos saldos y peces. Con otra cuenta de Telegram debes ver un estanque independiente.

El Blueprint usa planes gratuitos para estas pruebas. La base gratuita de Render **caduca a los 30 días**; hay que cambiarla a un plan persistente de pago antes de esa fecha para conservar el progreso. El servicio web gratuito también puede dormir tras periodos de inactividad. No usar esta configuración como lanzamiento definitivo con dinero real. Referencia: https://render.com/docs/free

El servidor no responde a mensajes `/start`: el juego se abre mediante la Main App o el botón del menú. Este despliegue no configura un webhook de mensajes.

## Cuentas y progreso

La versión online valida la firma de `Telegram.WebApp.initData` y su antigüedad antes de identificar al jugador. Guarda sesiones con tokens aleatorios, almacenados como hashes, y progreso en PostgreSQL. La cuenta nueva empieza con cinco truchas y 6.500 VIEW de prueba. La recompensa diaria es 300 VIEW, una vez por día UTC.

El progreso anterior de la demo de GitHub Pages permanece local y no se importa: el navegador no puede acreditar saldos en el servidor. La recarga ilimitada de 10.000 VIEW solo existe en la demo local.

Las compras, la recogida de CASH y el combate se resuelven en el servidor. Cada operación tiene una clave para evitar duplicados al reintentar; se bloquea la fila del jugador durante la transacción. El cliente comunica el botón mantenido y las solicitudes de lanzar/capturar, pero no puede indicar un pez ganado, un saldo ni una hora de captura. Una desconexión deja de mantener el botón después de dos segundos.

## Desarrollo

Requiere Node.js 24 y PostgreSQL. Instala con `npm ci`, configura las variables del ejemplo y ejecuta `npm start`. El servidor sirve también la interfaz desde su propio origen.

`npm test` prueba la economía, la vida de los peces, las firmas de Telegram, las operaciones HTTP, los reintentos, cuentas separadas y la persistencia tras reiniciar PostgreSQL embebido (PGlite). No requiere credenciales reales.

Para la demo local: `npm run demo` y abre `http://localhost:8080/?demo=1`. GitHub Pages mantiene la demo local independiente.

## Antes de habilitar pagos

Este despliegue es la fase de pruebas online. Faltan la verificación de depósitos en blockchain, el sistema de retiros y reservas, la gestión administrativa y las pruebas completas en Telegram móvil. La dirección de depósito mostrada no permite acreditar un pago por sí sola. No enviar dinero durante esta fase.
