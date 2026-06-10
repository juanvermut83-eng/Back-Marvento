const Pedido = require('../models/pedido');

const formatPedido = (pedido) => ({
    id: pedido._id,
    numero: pedido.numero,
    estado: pedido.estado,
    items: pedido.items,
    cantidadTotal: pedido.cantidadTotal,
    subtotal: pedido.subtotal,
    total: pedido.total,
    cliente: pedido.cliente,
    envio: pedido.envio,
    mercadoPago: pedido.mercadoPago,
    createdAt: pedido.createdAt,
    updatedAt: pedido.updatedAt,
});

const listarPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const resumen = pedidos.reduce(
            (acc, pedido) => {
                acc.totalPedidos += 1;
                if (pedido.estado === 'PAGADO') {
                    acc.ventasPagadas += 1;
                    acc.ingresoPagado += pedido.total || 0;
                }
                return acc;
            },
            {
                totalPedidos: 0,
                ventasPagadas: 0,
                ingresoPagado: 0,
            }
        );

        return res.json({
            resumen,
            pedidos: pedidos.map(formatPedido),
        });
    } catch (error) {
        console.error('Error al listar pedidos:', error);
        return res.status(500).json({ message: 'Error al obtener pedidos' });
    }
};

const obtenerPedidoPublico = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id).lean();

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        return res.json({
            id: pedido._id,
            numero: pedido.numero,
            estado: pedido.estado,
            total: pedido.total,
            cantidadTotal: pedido.cantidadTotal,
            createdAt: pedido.createdAt,
        });
    } catch (error) {
        return res.status(400).json({ message: 'Pedido invalido' });
    }
};

module.exports = {
    listarPedidos,
    obtenerPedidoPublico,
};
