const express = require("express");
const { crearPreferencia, recibirWebhook, registrarRetorno } = require("../controllers/mercadoPago");

const router = express.Router();

router.post("/preferencia", crearPreferencia);
router.post("/webhook", recibirWebhook);
router.post("/pedidos/:pedidoId/retorno", registrarRetorno);

module.exports = router;
