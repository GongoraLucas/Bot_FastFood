const twilio = require("twilio");
const { MessagingResponse } = twilio.twiml;
const messages = require("../utils/messages");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const CLIENT_NUMBER = process.env.CLIENT_NUMBER;

const client = twilio(accountSid, authToken);

const users = {};
const INACTIVITY_TIME = 60000;

/**
 * ===============================
 * PRODUCTOS
 * ===============================
 */
const products = {
  1: { id: "1", name: "Hamburguesa", price: 3.5 },
  2: { id: "2", name: "Salchipapas", price: 2.5 },
  3: { id: "3", name: "Papi Pollo", price: 4.0 },
};

/**
 * ===============================
 * PROMOCIONES
 * ===============================
 */
const promotions = {
  1: { id: "promo1", name: "Hamburguesa + Salchipapas", price: 5.0 },
};

/**
 * ===============================
 * UTILIDADES
 * ===============================
 */

function sendResponse(res, twiml, message) {
  twiml.message(message);
  return res.send(twiml.toString());
}

function resetToMainMenu(user) {
  user.status = "esperando_opcion";
  user.currentOrder = [];
  user.statusBeforeInactivity = null;
}

function clearUserTimer(user) {
  if (user.timer) {
    clearTimeout(user.timer);
    user.timer = null;
  }
}

/**
 * ===============================
 * GENERADORES
 * ===============================
 */

function generatePromotionMenu() {
  let text = messages.promotions + "\n\n";

  Object.keys(promotions).forEach((key) => {
    const promo = promotions[key];
    text += `${key}. ${promo.name} - $${promo.price.toFixed(2)}\n`;
  });

  text += "\nEscoja la promoción que desea o escriba *volver* para regresar al menú principal.";

  return text;
}

function generatePromotionSummary(user) {
  const promo = user.currentOrder[0];

  return (
    "🧾 *Resumen de tu pedido:*\n\n" +
    `1. ${promo.name} - $${promo.price.toFixed(2)}\n\n` +
    `💵 *Total:* $${promo.price.toFixed(2)}\n\n` +
    "1️⃣ Confirmar pedido\n" +
    "2️⃣ Ver método de pago\n" +
    "3️⃣ Cancelar pedido"
  );
}

function generateSummary(user) {
  let total = 0;
  let summary = "🧾 *Resumen de tu pedido:*\n\n";

  user.currentOrder.forEach((product, index) => {
    const subtotal = product.price * product.quantity;
    total += subtotal;

    summary += `${index + 1}. ${product.name} x${product.quantity} - $${subtotal.toFixed(2)}\n`;
  });

  summary += `\n💵 *Total:* $${total.toFixed(2)}\n\n`;
  summary +=
    "1️⃣ Confirmar\n" +
    "2️⃣ Eliminar producto\n" +
    "3️⃣ Método de pago\n" +
    "4️⃣ Agregar más productos\n" +
    "5️⃣ Cancelar pedido";

  return summary;
}

function generateDeleteMenu(user) {
  let message = "🗑️ *Selecciona el producto que deseas eliminar:*\n\n";

  user.currentOrder.forEach((product, index) => {
    message += `${index + 1}. ${product.name} x${product.quantity}\n`;
  });

  message += "\nEscribe el número del producto.";

  return message;
}

/**
 * ===============================
 * INACTIVIDAD
 * ===============================
 */

const startInactivityTimer = (from) => {
  const user = users[from];
  clearUserTimer(user);

  user.timer = setTimeout(async () => {
    if (!user.inactivitySent) {
      try {
        await client.messages.create({
          from: twilioNumber,
          to: from,
          body: messages.inactivity,
        });

        user.inactivitySent = true;
        user.statusBeforeInactivity = user.status;
        user.status = "esperando_respuesta_inactividad";
      } catch (error) {
        console.error("Error enviando mensaje de inactividad:", error.message);
      }
    }
  }, INACTIVITY_TIME);
};

/**
 * ===============================
 * CONTROLADOR PRINCIPAL
 * ===============================
 */

exports.handleMessage = async (req, res) => {
  const from = req.body.From;
  const incomingMsg = (req.body.Body || "").trim();
  const lowerMsg = incomingMsg.toLowerCase();
  const twiml = new MessagingResponse();

  if (!users[from]) {
    users[from] = {
      status: "inicio",
      currentOrder: [],
      timer: null,
      inactivitySent: false,
      statusBeforeInactivity: null,
    };
  }

  const user = users[from];
  user.inactivitySent = false;

  const orderStates = [
    "haciendo_pedido",
    "confirmando",
    "eliminando_producto",
    "confirmando_promocion",
  ];

  if (orderStates.includes(user.status)) {
    startInactivityTimer(from);
  } else {
    clearUserTimer(user);
  }

  if (lowerMsg === "volver") {
    clearUserTimer(user);
    resetToMainMenu(user);
    return sendResponse(res, twiml, messages.welcome);
  }

  if (user.status === "esperando_respuesta_inactividad") {
    if (incomingMsg === "1") {
      user.status = user.statusBeforeInactivity || "esperando_opcion";
      return sendResponse(res, twiml, "✅ Continuamos con tu pedido 😊");
    }

    if (incomingMsg === "2") {
      resetToMainMenu(user);
      return sendResponse(res, twiml, messages.welcome);
    }

    return sendResponse(res, twiml, "1️⃣ Continuar\n2️⃣ Volver al menú");
  }

  if (user.status === "inicio") {
    user.status = "esperando_opcion";
    return sendResponse(res, twiml, messages.welcome);
  }

  /**
   * MENÚ PRINCIPAL
   */
  if (user.status === "esperando_opcion") {
    switch (incomingMsg) {
      case "1":
        user.status = "haciendo_pedido";
        return sendResponse(res, twiml, messages.menu);

      case "2":
        return sendResponse(res, twiml, messages.menu);

      case "3":
        user.status = "viendo_promociones";
        return sendResponse(res, twiml, generatePromotionMenu());

      case "4":
        return sendResponse(res, twiml, messages.location);

      case "5":
        return sendResponse(res, twiml, messages.hours);

      case "6":
        return sendResponse(res, twiml, `👩‍💼 Comunícate al:\n${CLIENT_NUMBER}`);

      default:
        return sendResponse(res, twiml, messages.default);
    }
  }

  /**
   * VIENDO PROMOCIONES
   */
  if (user.status === "viendo_promociones") {
    if (!promotions[incomingMsg]) {
      return sendResponse(res, twiml, "⚠️ Opción inválida. Selecciona una promoción válida o escribe *volver*.");
    }

    const selectedPromo = promotions[incomingMsg];

    user.currentOrder = [{ ...selectedPromo, quantity: 1 }];
    user.status = "confirmando_promocion";

    return sendResponse(res, twiml, generatePromotionSummary(user));
  }

  /**
   * CONFIRMANDO PROMOCIÓN
   */
  if (user.status === "confirmando_promocion") {
    switch (incomingMsg) {
      case "1":
        clearUserTimer(user);
        user.currentOrder = [];
        user.status = "esperando_opcion";
        return sendResponse(res, twiml, `🎉 ¡Pedido confirmado!\n\nTu orden estará lista en 20 minutos 🚚`);

      case "2":
        return sendResponse(res, twiml, "💵 Método de pago disponible:\n\n• Efectivo");

      case "3":
        clearUserTimer(user);
        resetToMainMenu(user);
        return sendResponse(res, twiml, `❌ Pedido cancelado.\n\n${messages.welcome}`);

      default:
        return sendResponse(res, twiml, "1️⃣ Confirmar pedido\n2️⃣ Ver método de pago\n3️⃣ Cancelar pedido");
    }
  }

  /**
   * AQUÍ SIGUE TODO TU FLUJO ORIGINAL SIN TOCAR
   */

  if (user.status === "haciendo_pedido") {
    if (incomingMsg === "0") {
      if (user.currentOrder.length === 0) {
        return sendResponse(res, twiml, "⚠️ Aún no agregaste productos.");
      }

      user.status = "confirmando";
      return sendResponse(res, twiml, generateSummary(user));
    }

    if (products[incomingMsg]) {
      const existing = user.currentOrder.find(p => p.id === incomingMsg);

      if (existing) {
        existing.quantity += 1;
      } else {
        user.currentOrder.push({
          ...products[incomingMsg],
          quantity: 1,
        });
      }

      return sendResponse(
        res,
        twiml,
        `✅ ${products[incomingMsg].name} agregado.\n\nSelecciona otro producto o presiona 0️⃣ para terminar.`
      );
    }

    return sendResponse(res, twiml, "⚠️ Selecciona un número válido del menú.");
  }

  if (user.status === "confirmando") {
    switch (incomingMsg) {
      case "1":
        clearUserTimer(user);
        user.currentOrder = [];
        user.status = "esperando_opcion";
        return sendResponse(res, twiml, `🎉 ¡Pedido confirmado!\n\nTu orden estará lista en 20 minutos 🚚\n\n`);

      case "2":
        user.status = "eliminando_producto";
        return sendResponse(res, twiml, generateDeleteMenu(user));

      case "3":
        return sendResponse(res, twiml, messages.payment);

      case "4":
        user.status = "haciendo_pedido";
        return sendResponse(res, twiml, messages.menu);

      case "5":
        clearUserTimer(user);
        resetToMainMenu(user);
        return sendResponse(res, twiml, `❌ Tu pedido fue cancelado.\n\n${messages.welcome}`);

      default:
        return sendResponse(
          res,
          twiml,
          "1️⃣ Confirmar\n2️⃣ Eliminar producto\n3️⃣ Método de pago\n4️⃣ Agregar más productos\n5️⃣ Cancelar pedido"
        );
    }
  }

  if (user.status === "eliminando_producto") {
    const index = Number(incomingMsg) - 1;

    if (!Number.isInteger(index) || !user.currentOrder[index]) {
      return sendResponse(res, twiml, "⚠️ Selecciona un número válido.");
    }

    if (user.currentOrder[index].quantity > 1) {
      user.currentOrder[index].quantity -= 1;
    } else {
      user.currentOrder.splice(index, 1);
    }

    if (user.currentOrder.length === 0) {
      user.status = "haciendo_pedido";
      return sendResponse(res, twiml, "🛒 Tu carrito está vacío.\n\n" + messages.menu);
    }

    user.status = "confirmando";
    return sendResponse(res, twiml, generateSummary(user));
  }

  return sendResponse(res, twiml, messages.default);
};