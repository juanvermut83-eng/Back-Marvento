const express = require('express');
const { listarPedidos, obtenerPedidoPublico } = require('../controllers/pedido');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/roles.middleware');

const router = express.Router();

router.get('/', verifyToken, allowRoles('ADMIN', 'EMPLEADO'), listarPedidos);
router.get('/:id/publico', obtenerPedidoPublico);

module.exports = router;
