const express = require('express');
const {
    actualizarEstadoConsulta,
    crearConsulta,
    eliminarConsulta,
    listarConsultas,
} = require('../controllers/consulta');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/roles.middleware');

const router = express.Router();

router.post('/', crearConsulta);
router.get('/admin', verifyToken, allowRoles('ADMIN', 'EMPLEADO'), listarConsultas);
router.patch('/:id/estado', verifyToken, allowRoles('ADMIN', 'EMPLEADO'), actualizarEstadoConsulta);
router.delete('/:id', verifyToken, allowRoles('ADMIN'), eliminarConsulta);

module.exports = router;
