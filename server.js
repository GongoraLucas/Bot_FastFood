/**
 * ==============================
 *  CONFIGURACIÓN PRINCIPAL APP
 * ==============================
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

/**
 * ==============================
 *  MIDDLEWARES
 * ==============================
 */

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**
 * ==============================
 *  RUTAS
 * ==============================
 */

app.use('/webhook', whatsappRoutes);

/**
 * ==============================
 *  SERVIDOR
 * ==============================
 */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});