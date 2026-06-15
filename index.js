const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const dbConnection = require("./src/config/db");

dotenv.config();

const createAdmin = require('./src/boostrap/creaAdmin'); //creo admin
const authRoutes = require("./src/routes/auth");
const personaRoutes = require("./src/routes/persona");
const mercadoPagoRoutes = require("./src/routes/mercadoPago");
const pedidoRoutes = require("./src/routes/pedido");
const productoRoutes = require("./src/routes/producto");


const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

const startServer = async () => {
  // DB
  await dbConnection();

  //disparo createAdmin
  await createAdmin();

  // Rutas
  app.use("/auth", authRoutes);
  app.use("/personas", personaRoutes);
  app.use("/mercadopago", mercadoPagoRoutes);
  app.use("/pedidos", pedidoRoutes);
  app.use("/productos", productoRoutes);

  // Puerto
  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log("Servidor escuchando en puerto:", PORT);
  });
};

startServer();
