const express = require("express");
const router = express.Router();
const { login, loginGoogle, registrar, obtenerSiguienteCodigoPersona } = require("../controllers/auth");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");

// Login → público
router.post("/login", login);
router.post("/login/google", loginGoogle);
router.get("/siguiente-codigo", verifyToken, isAdmin, obtenerSiguienteCodigoPersona);

// Registrar empleados/admin → SOLO ADMIN
router.post(
    "/registrar",
    verifyToken,
    isAdmin,
    registrar
);

module.exports = router;
