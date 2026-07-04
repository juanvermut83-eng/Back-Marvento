const { Schema, model } = require('mongoose');

const ConsultaSchema = new Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 160,
        },
        telefono: {
            type: String,
            trim: true,
            maxlength: 60,
        },
        motivo: {
            type: String,
            enum: ['compra', 'mayorista', 'evento', 'puntos-de-venta', 'otro'],
            default: 'otro',
            index: true,
        },
        mensaje: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        estado: {
            type: String,
            enum: ['NUEVA', 'LEIDA', 'RESPONDIDA', 'ARCHIVADA'],
            default: 'NUEVA',
            index: true,
        },
        historialEstados: [
            {
                estado: { type: String, required: true },
                usuarioId: { type: String, trim: true },
                fecha: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

module.exports = model('Consulta', ConsultaSchema);
