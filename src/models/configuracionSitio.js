const { Schema, model } = require("mongoose");

const ConfiguracionSitioSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "global",
        },
        productosVisible: {
            type: Boolean,
            default: true,
        },
        carritoActivo: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = model("ConfiguracionSitio", ConfiguracionSitioSchema);
