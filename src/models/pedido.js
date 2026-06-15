const { Schema, model } = require('mongoose');

const PedidoItemSchema = new Schema(
    {
        productoId: {
            type: String,
            required: true,
            trim: true,
        },
        nombre: {
            type: String,
            required: true,
            trim: true,
        },
        cantidad: {
            type: Number,
            required: true,
            min: 1,
        },
        precioUnitario: {
            type: Number,
            required: true,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const PedidoSchema = new Schema(
    {
        numero: {
            type: Number,
            unique: true,
            sparse: true,
        },
        estado: {
            type: String,
            enum: ['CREADO', 'PENDIENTE', 'PAGADO', 'FALLIDO', 'CANCELADO'],
            default: 'CREADO',
            index: true,
        },
        items: {
            type: [PedidoItemSchema],
            required: true,
            validate: [(items) => items.length > 0, 'El pedido debe tener items'],
        },
        cantidadTotal: {
            type: Number,
            required: true,
            min: 1,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        cliente: {
            nombre: { type: String, trim: true },
            apellido: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            telefono: { type: String, trim: true },
        },
        envio: {
            direccion: { type: String, trim: true },
            localidad: { type: String, trim: true },
            provincia: { type: String, trim: true },
            codigoPostal: { type: String, trim: true },
            notas: { type: String, trim: true },
        },
        mercadoPago: {
            preferenceId: { type: String, trim: true, index: true },
            paymentId: { type: String, trim: true, index: true },
            merchantOrderId: { type: String, trim: true },
            status: { type: String, trim: true },
            statusDetail: { type: String, trim: true },
            externalReference: { type: String, trim: true, index: true },
            initPoint: { type: String, trim: true },
        },
        stockDescontado: {
            type: Boolean,
            default: false,
        },
        historialEstados: [
            {
                estado: { type: String, required: true },
                detalle: { type: String, trim: true },
                origen: { type: String, trim: true },
                fecha: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

PedidoSchema.pre('save', async function asignarNumero() {
    if (this.numero) {
        return;
    }

    const ultimoPedido = await this.constructor
        .findOne({ numero: { $exists: true } })
        .sort({ numero: -1 })
        .select('numero')
        .lean();

    this.numero = Number(ultimoPedido?.numero || 0) + 1;
});

module.exports = model('Pedido', PedidoSchema);
