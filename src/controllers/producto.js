const Producto = require("../models/producto");

const PRODUCTOS_INICIALES = [
    {
        slug: "rojo",
        nombre: "Marvento Rojo",
        tipo: "Vermut rosso",
        descripcion: "Intenso, especiado y botanico. Pensado para servir con hielo, piel de naranja y soda.",
        notas: ["Ajenjo", "Cascara citrica", "Hierbas tostadas"],
        precioUnitario: 10,
        stock: 24,
        color: "red",
        activo: true,
    },
    {
        slug: "bianco",
        nombre: "Marvento Bianco",
        tipo: "Vermut blanco seco",
        descripcion: "Fresco, herbal y elegante. Ideal para aperitivos largos, tonica y rodaja de limon.",
        notas: ["Flores blancas", "Citrus", "Salvia"],
        precioUnitario: 10,
        stock: 24,
        color: "white",
        activo: true,
    },
];

const normalizarSlug = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const formatProducto = (producto) => ({
    id: producto.slug,
    slug: producto.slug,
    nombre: producto.nombre,
    tipo: producto.tipo,
    descripcion: producto.descripcion,
    notas: producto.notas || [],
    precioUnitario: producto.precioUnitario,
    stock: producto.stock,
    color: producto.color,
    activo: producto.activo,
    createdAt: producto.createdAt,
    updatedAt: producto.updatedAt,
});

const ensureProductosIniciales = async () => {
    const total = await Producto.countDocuments();

    if (total > 0) {
        return;
    }

    await Producto.insertMany(PRODUCTOS_INICIALES);
};

const normalizarProductoInput = (body = {}) => {
    const nombre = String(body.nombre || "").trim();
    const slug = normalizarSlug(body.slug || body.id || nombre);
    const tipo = String(body.tipo || "").trim();
    const descripcion = String(body.descripcion || "").trim();
    const precioUnitario = Number(body.precioUnitario);
    const stock = Number(body.stock);
    const notas = Array.isArray(body.notas)
        ? body.notas.map((nota) => String(nota).trim()).filter(Boolean)
        : String(body.notas || "")
            .split(",")
            .map((nota) => nota.trim())
            .filter(Boolean);

    return {
        slug,
        nombre,
        tipo,
        descripcion,
        notas,
        precioUnitario,
        stock,
        color: ["red", "white"].includes(body.color) ? body.color : "red",
        activo: body.activo !== false,
    };
};

const validarProductoInput = (producto) => {
    if (!producto.slug || !producto.nombre || !producto.tipo || !producto.descripcion) {
        return "Nombre, tipo y descripcion son obligatorios";
    }

    if (!Number.isFinite(producto.precioUnitario) || producto.precioUnitario <= 0) {
        return "El precio debe ser mayor a cero";
    }

    if (!Number.isInteger(producto.stock) || producto.stock < 0) {
        return "El stock debe ser un numero entero mayor o igual a cero";
    }

    return "";
};

const listarProductosPublicos = async (req, res) => {
    try {
        await ensureProductosIniciales();

        const productos = await Producto.find({ activo: true })
            .sort({ createdAt: 1 })
            .lean();

        return res.json({ productos: productos.map(formatProducto) });
    } catch (error) {
        console.error("Error al listar productos publicos:", error);
        return res.status(500).json({ message: "No se pudieron obtener los productos" });
    }
};

const listarProductosAdmin = async (req, res) => {
    try {
        await ensureProductosIniciales();

        const productos = await Producto.find()
            .sort({ createdAt: 1 })
            .lean();

        return res.json({ productos: productos.map(formatProducto) });
    } catch (error) {
        console.error("Error al listar productos admin:", error);
        return res.status(500).json({ message: "No se pudieron obtener los productos" });
    }
};

const crearProducto = async (req, res) => {
    try {
        const productoInput = normalizarProductoInput(req.body);
        const validationError = validarProductoInput(productoInput);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const producto = await Producto.create(productoInput);

        return res.status(201).json({ producto: formatProducto(producto) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe un producto con ese identificador" });
        }

        console.error("Error al crear producto:", error);
        return res.status(500).json({ message: "No se pudo crear el producto" });
    }
};

const modificarProducto = async (req, res) => {
    try {
        const productoInput = normalizarProductoInput(req.body);
        const validationError = validarProductoInput(productoInput);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const producto = await Producto.findOneAndUpdate(
            { slug: req.params.slug },
            productoInput,
            { new: true, runValidators: true }
        );

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        return res.json({ producto: formatProducto(producto) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe un producto con ese identificador" });
        }

        console.error("Error al modificar producto:", error);
        return res.status(500).json({ message: "No se pudo modificar el producto" });
    }
};

const eliminarProducto = async (req, res) => {
    try {
        const producto = await Producto.findOneAndDelete({ slug: req.params.slug });

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        return res.json({ message: "Producto eliminado" });
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        return res.status(500).json({ message: "No se pudo eliminar el producto" });
    }
};

module.exports = {
    ensureProductosIniciales,
    formatProducto,
    listarProductosPublicos,
    listarProductosAdmin,
    crearProducto,
    modificarProducto,
    eliminarProducto,
};
