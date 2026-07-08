const ConfiguracionSitio = require("../models/configuracionSitio");

const DEFAULT_CONFIG = {
    productosVisible: true,
    carritoActivo: true,
};

const formatConfig = (config) => ({
    productosVisible: true,
    carritoActivo: config?.carritoActivo !== false,
});

const getConfiguracionSitio = async () => {
    const config = await ConfiguracionSitio.findOneAndUpdate(
        { key: "global" },
        { $setOnInsert: { key: "global", ...DEFAULT_CONFIG } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return formatConfig(config);
};

const obtenerConfiguracionPublica = async (req, res) => {
    try {
        const configuracion = await getConfiguracionSitio();

        return res.json({ configuracion });
    } catch (error) {
        console.error("Error al obtener configuracion publica:", error);
        return res.status(500).json({ message: "No se pudo obtener la configuracion" });
    }
};

const obtenerConfiguracionAdmin = async (req, res) => {
    try {
        const configuracion = await getConfiguracionSitio();

        return res.json({ configuracion });
    } catch (error) {
        console.error("Error al obtener configuracion admin:", error);
        return res.status(500).json({ message: "No se pudo obtener la configuracion" });
    }
};

const actualizarConfiguracionAdmin = async (req, res) => {
    try {
        const updates = {};

        if (typeof req.body?.productosVisible === "boolean") {
            updates.productosVisible = true;
        }

        if (typeof req.body?.carritoActivo === "boolean") {
            updates.carritoActivo = req.body.carritoActivo;
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "No hay cambios validos para guardar" });
        }

        const config = await ConfiguracionSitio.findOneAndUpdate(
            { key: "global" },
            { $set: updates, $setOnInsert: { key: "global" } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        return res.json({ configuracion: formatConfig(config) });
    } catch (error) {
        console.error("Error al actualizar configuracion admin:", error);
        return res.status(500).json({ message: "No se pudo actualizar la configuracion" });
    }
};

module.exports = {
    getConfiguracionSitio,
    obtenerConfiguracionPublica,
    obtenerConfiguracionAdmin,
    actualizarConfiguracionAdmin,
};
