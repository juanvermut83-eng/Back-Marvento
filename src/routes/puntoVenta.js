const express = require("express");
const {
    crearPunto,
    eliminarPunto,
    listarPuntosAdmin,
    listarPuntosPublicos,
    modificarPunto,
} = require("../controllers/puntoVenta");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/roles.middleware");

const router = express.Router();

router.get("/", listarPuntosPublicos);
router.get("/admin", verifyToken, allowRoles("ADMIN", "EMPLEADO"), listarPuntosAdmin);
router.post("/", verifyToken, allowRoles("ADMIN", "EMPLEADO"), crearPunto);
router.put("/:slug", verifyToken, allowRoles("ADMIN", "EMPLEADO"), modificarPunto);
router.delete("/:slug", verifyToken, allowRoles("ADMIN", "EMPLEADO"), eliminarPunto);

module.exports = router;
