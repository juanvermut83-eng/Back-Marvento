const PuntoVenta = require("../models/puntoVenta");
const PUNTOS_INICIALES = require("../data/puntosVentaIniciales");

const normalizarSlug = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const formatPuntoVenta = (punto) => ({
    id: punto.slug,
    slug: punto.slug,
    nombre: punto.nombre,
    categoria: punto.categoria,
    direccion: punto.direccion,
    localidad: punto.localidad,
    provincia: punto.provincia,
    lat: punto.lat,
    lng: punto.lng,
    activo: punto.activo,
    orden: punto.orden,
    maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${punto.direccion}, ${punto.localidad}`)}`,
    createdAt: punto.createdAt,
    updatedAt: punto.updatedAt,
});

const ensurePuntosIniciales = async () => {
    const total = await PuntoVenta.countDocuments();

    if (total > 0) return;

    await PuntoVenta.insertMany(PUNTOS_INICIALES);
};

const normalizarPuntoInput = (body = {}) => ({
    slug: normalizarSlug(body.slug || body.id || `${body.nombre || ""}-${body.direccion || ""}`),
    nombre: String(body.nombre || "").trim(),
    categoria: body.categoria === "bar" ? "bar" : "comercio",
    direccion: String(body.direccion || "").trim(),
    localidad: String(body.localidad || "").trim(),
    provincia: String(body.provincia || "Buenos Aires").trim(),
    lat: Number(body.lat),
    lng: Number(body.lng),
    activo: body.activo !== false,
    orden: Number.isFinite(Number(body.orden)) ? Number(body.orden) : 0,
});

const validarPuntoInput = (punto) => {
    if (!punto.slug || !punto.nombre || !punto.direccion || !punto.localidad) {
        return "Nombre, direccion y localidad son obligatorios";
    }

    if (!Number.isFinite(punto.lat) || punto.lat < -90 || punto.lat > 90) {
        return "La latitud debe estar entre -90 y 90";
    }

    if (!Number.isFinite(punto.lng) || punto.lng < -180 || punto.lng > 180) {
        return "La longitud debe estar entre -180 y 180";
    }

    return "";
};

const listarPuntosPublicos = async (req, res) => {
    try {
        await ensurePuntosIniciales();

        const puntos = await PuntoVenta.find({ activo: true })
            .sort({ orden: 1, nombre: 1 })
            .lean();

        return res.json({ puntos: puntos.map(formatPuntoVenta) });
    } catch (error) {
        console.error("Error al listar puntos de venta publicos:", error);
        return res.status(500).json({ message: "No se pudieron obtener los puntos de venta" });
    }
};

const listarPuntosAdmin = async (req, res) => {
    try {
        await ensurePuntosIniciales();

        const puntos = await PuntoVenta.find()
            .sort({ orden: 1, nombre: 1 })
            .lean();

        return res.json({ puntos: puntos.map(formatPuntoVenta) });
    } catch (error) {
        console.error("Error al listar puntos de venta admin:", error);
        return res.status(500).json({ message: "No se pudieron obtener los puntos de venta" });
    }
};

const crearPunto = async (req, res) => {
    try {
        const puntoInput = normalizarPuntoInput(req.body);
        const validationError = validarPuntoInput(puntoInput);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const punto = await PuntoVenta.create(puntoInput);

        return res.status(201).json({ punto: formatPuntoVenta(punto) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe un punto de venta con ese identificador" });
        }

        console.error("Error al crear punto de venta:", error);
        return res.status(500).json({ message: "No se pudo crear el punto de venta" });
    }
};

const modificarPunto = async (req, res) => {
    try {
        const puntoInput = normalizarPuntoInput(req.body);
        const validationError = validarPuntoInput(puntoInput);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const punto = await PuntoVenta.findOneAndUpdate(
            { slug: req.params.slug },
            puntoInput,
            { new: true, runValidators: true }
        );

        if (!punto) {
            return res.status(404).json({ message: "Punto de venta no encontrado" });
        }

        return res.json({ punto: formatPuntoVenta(punto) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe un punto de venta con ese identificador" });
        }

        console.error("Error al modificar punto de venta:", error);
        return res.status(500).json({ message: "No se pudo modificar el punto de venta" });
    }
};

const eliminarPunto = async (req, res) => {
    try {
        const punto = await PuntoVenta.findOneAndDelete({ slug: req.params.slug });

        if (!punto) {
            return res.status(404).json({ message: "Punto de venta no encontrado" });
        }

        return res.json({ message: "Punto de venta eliminado" });
    } catch (error) {
        console.error("Error al eliminar punto de venta:", error);
        return res.status(500).json({ message: "No se pudo eliminar el punto de venta" });
    }
};

module.exports = {
    ensurePuntosIniciales,
    formatPuntoVenta,
    listarPuntosPublicos,
    listarPuntosAdmin,
    crearPunto,
    modificarPunto,
    eliminarPunto,
};
