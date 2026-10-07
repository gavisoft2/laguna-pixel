# Laguna Pixel — v0.1
Juego móvil de pesca original inspirado en mecánicas de colección. Prototipo independiente de Reinos de Etherial y PixelPond.

## Jugar
Sirve esta carpeta como sitio estático HTTPS, o ejecuta `npm start` y abre http://localhost:8080. No requiere instalar dependencias. Ejecuta `npm test` para comprobar la economía.

## Implementado
Estanque pixelado animado, pesca por paquetes, probabilidades 80/15/5, colección, producción sin conexión, recogida, tarea diaria y guardado local. Común 13, raro 30, épico 75 CASH diarios. Inicio: 5 truchas y 6,500 FIN de prueba. Sin pagos reales.

## Telegram pendiente
Después de publicar en HTTPS, configurar el bot y la Mini App. Esta versión funciona como página móvil, pero todavía no autentica usuarios Telegram. Antes de usar saldos compartidos o pagos: backend, validación de initData, base de datos, reloj de servidor, registros de transacciones, verificación de depósitos, retiros y presupuesto de recompensas. Nunca colocar el token del bot ni claves privadas en estos archivos. El guardado local es modificable y no sirve como saldo financiero.

## Siguientes entregas
1. Autenticación Telegram y guardado en servidor.
2. Más especies, zonas, decoración y cría.
3. Economía validada y sistema de pagos, después de definir moneda y red.

Los valores de raros y épicos son propuestas propias. La especie legendaria (180/día) no está habilitada todavía. Peces visibles limitados a 40 para rendimiento; la producción incluye toda la colección.
