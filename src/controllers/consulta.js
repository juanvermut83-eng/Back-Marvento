const Consulta = require('../models/consulta');

const estadosPermitidos = ['NUEVA', 'LEIDA', 'RESPONDIDA', 'ARCHIVADA'];

const formatConsulta = (consulta) => ({
    id: consulta._id,
    nombre: consulta.nombre,
    email: consulta.email,
    telefono: consulta.telefono,
    motivo: consulta.motivo,
    mensaje: consulta.mensaje,
    estado: consulta.estado,
    historialEstados: consulta.historialEstados,
    createdAt: consulta.createdAt,
    updatedAt: consulta.updatedAt,
});

const crearConsulta = async (req, res) => {
    try {
        const { nombre, email, telefono, motivo, mensaje } = req.body || {};

        if (!nombre?.trim()) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        if (!mensaje?.trim()) {
            return res.status(400).json({ message: 'El mensaje es obligatorio' });
        }

        if (!email?.trim() && !telefono?.trim()) {
            return res.status(400).json({ message: 'Indica un email o telefono de contacto' });
        }

        const consulta = await Consulta.create({
            nombre,
            email,
            telefono,
            motivo,
            mensaje,
            historialEstados: [{ estado: 'NUEVA' }],
        });

        return res.status(201).json({
            message: 'Consulta recibida correctamente',
            consulta: formatConsulta(consulta),
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Datos de consulta invalidos' });
        }

        console.error('Error al crear consulta:', error);
        return res.status(500).json({ message: 'Error al registrar la consulta' });
    }
};

const listarConsultas = async (req, res) => {
    try {
        const consultas = await Consulta.find()
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const resumen = consultas.reduce(
            (acc, consulta) => {
                acc.total += 1;
                acc[consulta.estado] = (acc[consulta.estado] || 0) + 1;
                return acc;
            },
            { total: 0, NUEVA: 0, LEIDA: 0, RESPONDIDA: 0, ARCHIVADA: 0 }
        );

        return res.json({
            resumen,
            consultas: consultas.map(formatConsulta),
        });
    } catch (error) {
        console.error('Error al listar consultas:', error);
        return res.status(500).json({ message: 'Error al obtener consultas' });
    }
};

const actualizarEstadoConsulta = async (req, res) => {
    try {
        const estado = String(req.body?.estado || '').toUpperCase();

        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: 'Estado invalido' });
        }

        const consulta = await Consulta.findById(req.params.id);

        if (!consulta) {
            return res.status(404).json({ message: 'Consulta no encontrada' });
        }

        consulta.estado = estado;
        consulta.historialEstados.push({
            estado,
            usuarioId: req.user?.id,
        });

        await consulta.save();

        return res.json({
            message: 'Estado actualizado',
            consulta: formatConsulta(consulta),
        });
    } catch (error) {
        return res.status(400).json({ message: 'No se pudo actualizar la consulta' });
    }
};

const eliminarConsulta = async (req, res) => {
    try {
        const consulta = await Consulta.findByIdAndDelete(req.params.id);

        if (!consulta) {
            return res.status(404).json({ message: 'Consulta no encontrada' });
        }

        return res.json({ message: 'Consulta eliminada' });
    } catch (error) {
        return res.status(400).json({ message: 'No se pudo eliminar la consulta' });
    }
};

module.exports = {
    crearConsulta,
    listarConsultas,
    actualizarEstadoConsulta,
    eliminarConsulta,
};
