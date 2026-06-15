const { Schema, model } = require("mongoose");

const ProductoSchema = new Schema(
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
        },
        tipo: {
            type: String,
            required: true,
            trim: true,
        },
        descripcion: {
            type: String,
            required: true,
            trim: true,
        },
        notas: {
            type: [String],
            default: [],
        },
        precioUnitario: {
            type: Number,
            required: true,
            min: 0,
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        color: {
            type: String,
            enum: ["red", "white"],
            default: "red",
        },
        activo: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

module.exports = model("Producto", ProductoSchema);
