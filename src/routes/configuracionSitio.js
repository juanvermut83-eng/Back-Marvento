const express = require("express");
const {
    actualizarConfiguracionAdmin,
    obtenerConfiguracionAdmin,
    obtenerConfiguracionPublica,
} = require("../controllers/configuracionSitio");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/roles.middleware");

const router = express.Router();

router.get("/", obtenerConfiguracionPublica);
router.get("/admin", verifyToken, allowRoles("ADMIN", "EMPLEADO"), obtenerConfiguracionAdmin);
router.put("/admin", verifyToken, allowRoles("ADMIN", "EMPLEADO"), actualizarConfiguracionAdmin);

module.exports = router;
