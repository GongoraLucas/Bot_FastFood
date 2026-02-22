# Fast Food Milly WhatsApp Bot

## Cómo correr localmente

1. Instala dependencias: `npm install`
2. Configura `.env` con Twilio
3. Ejecuta servidor: `npm start`
4. Conecta URL del webhook en Twilio Sandbox

## Cómo usar 

- El flujo permite:
  - Mensaje de bienvenida
  - Selección de productos
  - Mostrar resumen final
- No guarda datos persistentes
- Para cambiar al número del cliente, solo actualiza `TWILIO_WHATSAPP_NUMBER`