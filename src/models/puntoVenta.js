const { Schema, model } = require("mongoose");

const PuntoVentaSchema = new Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        nombre: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
        },
        categoria: {
            type: String,
            enum: ["comercio", "bar"],
            default: "comercio",
            index: true,
        },
        direccion: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        localidad: {
            type: String,
            required: true,
            trim: true,
            maxlength: 90,
        },
        provincia: {
            type: String,
            trim: true,
            default: "Buenos Aires",
            maxlength: 90,
        },
        lat: {
            type: Number,
            required: true,
            min: -90,
            max: 90,
        },
        lng: {
            type: Number,
            required: true,
            min: -180,
            max: 180,
        },
        activo: {
            type: Boolean,
            default: true,
            index: true,
        },
        orden: {
            type: Number,
            default: 0,
            index: true,
        },
    },
    { timestamps: true }
);

module.exports = model("PuntoVenta", PuntoVentaSchema);
