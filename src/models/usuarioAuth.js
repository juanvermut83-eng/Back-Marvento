const mongoose = require("mongoose");

const UsuarioAuthSchema = new mongoose.Schema(
    {
        personaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Persona",
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        roles: {
            type: [String],
            enum: ["ADMIN", "EMPLEADO", "CLIENTE"],
            required: true,
        },
        permisos: {
            type: [String],
            default: [],
        },
        debeCambiarPassword: {
            type: Boolean,
            default: false,
        },
        resetPasswordToken: {
            type: String,
            index: true,
        },
        resetPasswordExpiresAt: {
            type: Date,
        },
        activo: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("UsuarioAuth", UsuarioAuthSchema);
