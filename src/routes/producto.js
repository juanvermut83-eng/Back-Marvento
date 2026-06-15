const express = require("express");
const {
    crearProducto,
    eliminarProducto,
    listarProductosAdmin,
    listarProductosPublicos,
    modificarProducto,
} = require("../controllers/producto");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/roles.middleware");

const router = express.Router();

router.get("/", listarProductosPublicos);
router.get("/admin", verifyToken, allowRoles("ADMIN", "EMPLEADO"), listarProductosAdmin);
router.post("/", verifyToken, allowRoles("ADMIN", "EMPLEADO"), crearProducto);
router.put("/:slug", verifyToken, allowRoles("ADMIN", "EMPLEADO"), modificarProducto);
router.delete("/:slug", verifyToken, allowRoles("ADMIN", "EMPLEADO"), eliminarProducto);

module.exports = router;
