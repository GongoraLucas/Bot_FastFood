const twilio = require('twilio');
const { MessagingResponse } = twilio.twiml;
const messages = require('../utils/messages');

const CLIENT_NUMBER = process.env.CLIENT_NUMBER;

const users = {};

/**
 * =====================================
 *  CONTROLADOR PRINCIPAL
 * =====================================
 */

exports.handleMessage = (req, res) => {

  const from = req.body.From;
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  const twiml = new MessagingResponse();

  /**
   * Inicializar usuario si no existe
   */
  if (!users[from]) {
    users[from] = {
      status: 'inicio',
      currentOrder: []
    };
  }

  const user = users[from];

  /**
   * Generar resumen del pedido
   */
  const showOrderSummary = () => {
    const orderSummary = user.currentOrder
      .map(item => `✔ ${item.name} - $${item.price.toFixed(2)}`)
      .join('\n');

    const total = user.currentOrder
      .reduce((acc, item) => acc + item.price, 0);

    return `🛒 Resumen de tu pedido:

${orderSummary}

Total: $${total.toFixed(2)}

1️⃣ Confirmar pedido
2️⃣ Cambiar pedido
3️⃣ Ver método de pago
✏️ Escribe "volver" para regresar al menu principal`;
  };

  /**
   * =====================================
   *  FLUJO INICIAL
   * =====================================
   */

  if (user.status === 'inicio' && 
     (incomingMsg.includes('hola') || incomingMsg.includes('hi'))) {

    user.status = 'esperando_opcion';
    twiml.message(messages.welcome);
    return res.send(twiml.toString());
  }

  /**
   * Comando universal "volver"
   */
  if (incomingMsg === 'volver') {
    user.status = 'esperando_opcion';
    twiml.message(messages.welcome);
    return res.send(twiml.toString());
  }

  /**
   * =====================================
   *  MENÚ PRINCIPAL
   * =====================================
   */

  if (user.status === 'esperando_opcion') {

    switch (incomingMsg) {

      case '1':
        user.status = 'haciendo_pedido';
        twiml.message(
          `🛒 ¡Genial! Escribe el nombre del producto:
hamburguesa, salchipapas o papi pollo.

Escribe "volver" para regresar al menú principal.`
        );
        break;

      case '2':
        twiml.message(messages.menu);
        break;

      case '3':
        twiml.message(messages.promotions);
        break;

      case '4':
        twiml.message(messages.location);
        break;

      case '5':
        twiml.message(messages.hours);
        break;

      case '6':
        twiml.message(
          `👩‍💼 Para hablar con un asesor, llama o escribe al:
${CLIENT_NUMBER}`
        );
        break;

      default:
        twiml.message(messages.default);
    }

    return res.send(twiml.toString());
  }

  /**
   * =====================================
   *  PROCESO DE PEDIDO
   * =====================================
   */

  if (user.status === 'haciendo_pedido') {

    if (incomingMsg === '3') {

      if (user.currentOrder.length === 0) {
        twiml.message(
          '⚠️ Aún no agregaste productos. Escribe el nombre del producto o "volver".'
        );
      } else {
        user.status = 'confirmando';
        twiml.message(showOrderSummary());
      }

      return res.send(twiml.toString());
    }

    let product = null;

    if (incomingMsg.includes('hamburguesa')) {
      product = { name: 'Hamburguesa', price: 3.5 };
    } else if (incomingMsg.includes('salchipapa')) {
      product = { name: 'Salchipapas', price: 2.5 };
    } else if (incomingMsg.includes('papi pollo')) {
      product = { name: 'Papi Pollo', price: 4.0 };
    }

    if (product) {
      user.currentOrder.push(product);

      twiml.message(
        `✅ Añadido: ${product.name}

Escribe otro producto,
"3" para terminar,
o "volver" para regresar.`
      );
    } else {
      twiml.message(
        '⚠️ Producto no reconocido. Escribe hamburguesa, salchipapas o papi pollo.'
      );
    }

    return res.send(twiml.toString());
  }

  /**
   * =====================================
   *  CONFIRMACIÓN FINAL
   * =====================================
   */

  if (user.status === 'confirmando') {

    switch (incomingMsg) {

      case '1':
        twiml.message(
          `🎉 ¡Pedido confirmado!

Tu orden estará lista en 20 minutos 🚚
Gracias por elegir Fast Food Milly 💛`
        );

        user.currentOrder = [];
        user.status = 'inicio';
        break;

      case '2':
        user.currentOrder = [];
        user.status = 'haciendo_pedido';
        twiml.message(
          '🛒 Pedido cancelado. Escribe el producto que deseas agregar.'
        );
        break;

      case '3':
        twiml.message('💳 Método de pago disponible: Efectivo');
        break;

      default:
        twiml.message(
          '⏳ Responde con 1️⃣ Confirmar, 2️⃣ Cambiar, 3️⃣ Método de pago.'
        );
    }

    return res.send(twiml.toString());
  }

  /**
   * =====================================
   *  RESPUESTA POR DEFECTO
   * =====================================
   */

  twiml.message(messages.default);
  res.send(twiml.toString());
};