const axios = require("axios");
const crypto = require("crypto");
const Pedido = require("../models/pedido");

const PRODUCTOS_CHECKOUT = {
    rojo: {
        id: "rojo",
        title: "Marvento Rojo",
        unit_price: 12500,
    },
    bianco: {
        id: "bianco",
        title: "Marvento Bianco",
        unit_price: 12500,
    },
};

const getAccessToken = () => process.env.MERCADOPAGO_ACCESS_TOKEN;
const getWebhookSecret = () => process.env.MERCADOPAGO_WEBHOOK_SECRET;

const getMercadoPagoErrorMessage = (error) => {
    const responseData = error.response?.data;
    const causeMessages = Array.isArray(responseData?.cause)
        ? responseData.cause
            .map((cause) => cause.description || cause.message || cause.code)
            .filter(Boolean)
        : [];

    return responseData?.message
        || responseData?.error
        || causeMessages.join(" | ")
        || error.message
        || "No se pudo crear la preferencia de pago";
};

const normalizarTexto = (value) => String(value || "").trim();

const normalizarCantidad = (cantidad) => {
    const cantidadNumero = Number(cantidad);

    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) {
        return null;
    }

    return cantidadNumero;
};

const mapEstadoMercadoPago = (status) => {
    const estados = {
        approved: "PAGADO",
        pending: "PENDIENTE",
        in_process: "PENDIENTE",
        authorized: "PENDIENTE",
        rejected: "FALLIDO",
        cancelled: "CANCELADO",
        refunded: "CANCELADO",
        charged_back: "CANCELADO",
    };

    return estados[status] || "PENDIENTE";
};

const parseSignatureHeader = (signatureHeader = "") => {
    return signatureHeader.split(",").reduce((parts, part) => {
        const [key, value] = part.split("=");

        if (key && value) {
            parts[key.trim()] = value.trim();
        }

        return parts;
    }, {});
};

const safeCompare = (expected, received) => {
    if (!expected || !received || expected.length !== received.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

const validarFirmaWebhook = (req) => {
    const secret = getWebhookSecret();

    if (!secret) {
        return true;
    }

    const signatureHeader = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];
    const { ts, v1 } = parseSignatureHeader(signatureHeader);

    if (!ts || !v1) {
        return false;
    }

    const dataId = req.query["data.id"] || req.query.id;
    const signatureParts = [];

    if (dataId) {
        signatureParts.push(`id:${String(dataId).toLowerCase()};`);
    }

    if (requestId) {
        signatureParts.push(`request-id:${requestId};`);
    }

    signatureParts.push(`ts:${ts};`);

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(signatureParts.join(""))
        .digest("hex");

    return safeCompare(expectedSignature, v1);
};

const validarCliente = (payer = {}, envio = {}) => {
    const cliente = {
        nombre: normalizarTexto(payer.nombre),
        apellido: normalizarTexto(payer.apellido),
        email: normalizarTexto(payer.email).toLowerCase(),
        telefono: normalizarTexto(payer.telefono),
    };

    const datosEnvio = {
        direccion: normalizarTexto(envio.direccion),
        localidad: normalizarTexto(envio.localidad),
        provincia: normalizarTexto(envio.provincia),
        codigoPostal: normalizarTexto(envio.codigoPostal),
        notas: normalizarTexto(envio.notas),
    };

    if (!cliente.nombre || !cliente.apellido || !cliente.email || !cliente.telefono) {
        return {
            error: "Nombre, apellido, email y telefono son obligatorios",
        };
    }

    if (!datosEnvio.direccion || !datosEnvio.localidad || !datosEnvio.provincia) {
        return {
            error: "Direccion, localidad y provincia son obligatorias",
        };
    }

    return { cliente, envio: datosEnvio };
};

const construirItems = (itemsCarrito) => {
    const itemsMercadoPago = [];
    const itemsPedido = [];

    for (const item of itemsCarrito) {
        const producto = PRODUCTOS_CHECKOUT[item?.id];
        const quantity = normalizarCantidad(item?.cantidad);

        if (!producto || !quantity) {
            return {
                error: "Hay productos invalidos en el carrito",
            };
        }

        const total = producto.unit_price * quantity;

        itemsMercadoPago.push({
            id: producto.id,
            title: producto.title,
            quantity,
            unit_price: producto.unit_price,
            currency_id: "ARS",
        });

        itemsPedido.push({
            productoId: producto.id,
            nombre: producto.title,
            cantidad: quantity,
            precioUnitario: producto.unit_price,
            total,
        });
    }

    return { itemsMercadoPago, itemsPedido };
};

const crearPreferencia = async (req, res) => {
    try {
        const accessToken = getAccessToken();

        if (!accessToken) {
            return res.status(500).json({
                message: "Mercado Pago no esta configurado en el servidor",
            });
        }

        const itemsCarrito = Array.isArray(req.body?.items) ? req.body.items : [];

        if (!itemsCarrito.length) {
            return res.status(400).json({
                message: "El carrito esta vacio",
            });
        }

        const clienteValidado = validarCliente(req.body?.payer, req.body?.envio);

        if (clienteValidado.error) {
            return res.status(400).json({ message: clienteValidado.error });
        }

        const itemsValidados = construirItems(itemsCarrito);

        if (itemsValidados.error) {
            return res.status(400).json({ message: itemsValidados.error });
        }

        const cantidadTotal = itemsValidados.itemsPedido.reduce(
            (total, item) => total + item.cantidad,
            0
        );
        const subtotal = itemsValidados.itemsPedido.reduce(
            (total, item) => total + item.total,
            0
        );

        const pedido = await Pedido.create({
            estado: "CREADO",
            items: itemsValidados.itemsPedido,
            cantidadTotal,
            subtotal,
            total: subtotal,
            cliente: clienteValidado.cliente,
            envio: clienteValidado.envio,
            historialEstados: [
                {
                    estado: "CREADO",
                    detalle: "Pedido creado antes de redirigir a Mercado Pago",
                    origen: "checkout",
                },
            ],
        });

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL;
        const pedidoId = pedido._id.toString();

        const preference = {
            items: itemsValidados.itemsMercadoPago,
            payer: {
                name: clienteValidado.cliente.nombre,
                surname: clienteValidado.cliente.apellido,
                email: clienteValidado.cliente.email,
                phone: {
                    number: clienteValidado.cliente.telefono,
                },
                address: {
                    street_name: clienteValidado.envio.direccion,
                    zip_code: clienteValidado.envio.codigoPostal || undefined,
                },
            },
            back_urls: {
                success: `${frontendUrl}/checkout/success?pedido=${pedidoId}`,
                failure: `${frontendUrl}/checkout/failure?pedido=${pedidoId}`,
                pending: `${frontendUrl}/checkout/pending?pedido=${pedidoId}`,
            },
            auto_return: "approved",
            external_reference: pedidoId,
            statement_descriptor: "MARVENTO",
        };

        if (webhookUrl) {
            preference.notification_url = webhookUrl;
        }

        const { data } = await axios.post(
            "https://api.mercadopago.com/checkout/preferences",
            preference,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        pedido.estado = "PENDIENTE";
        pedido.mercadoPago = {
            preferenceId: data.id,
            externalReference: pedidoId,
            initPoint: data.init_point || data.sandbox_init_point,
        };
        pedido.historialEstados.push({
            estado: "PENDIENTE",
            detalle: "Preferencia creada en Mercado Pago",
            origen: "mercadopago",
        });
        await pedido.save();

        const checkoutUrl = accessToken.startsWith("TEST-")
            ? (data.sandbox_init_point || data.init_point)
            : (data.init_point || data.sandbox_init_point);

        return res.status(201).json({
            pedidoId,
            preferenceId: data.id,
            checkout_url: checkoutUrl,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point,
        });
    } catch (error) {
        const status = error.response?.status || 500;
        const message = getMercadoPagoErrorMessage(error);

        console.error("Error Mercado Pago:", error.response?.data || error.message);

        return res.status(status >= 400 && status < 500 ? status : 500).json({
            message,
        });
    }
};

const actualizarPedidoDesdePago = async (paymentId) => {
    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error("Mercado Pago no esta configurado en el servidor");
    }

    const { data: payment } = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const pedidoId = payment.external_reference;
    const pedido = await Pedido.findById(pedidoId);

    if (!pedido) {
        return null;
    }

    const nuevoEstado = mapEstadoMercadoPago(payment.status);

    pedido.estado = nuevoEstado;
    pedido.mercadoPago = {
        ...pedido.mercadoPago?.toObject?.(),
        preferenceId: payment.preference_id || pedido.mercadoPago?.preferenceId,
        paymentId: String(payment.id),
        merchantOrderId: payment.order?.id ? String(payment.order.id) : pedido.mercadoPago?.merchantOrderId,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: pedidoId,
        initPoint: pedido.mercadoPago?.initPoint,
    };
    pedido.historialEstados.push({
        estado: nuevoEstado,
        detalle: `Pago ${payment.status}${payment.status_detail ? `: ${payment.status_detail}` : ""}`,
        origen: "webhook",
    });

    await pedido.save();

    return pedido;
};

const recibirWebhook = async (req, res) => {
    try {
        if (!validarFirmaWebhook(req)) {
            return res.sendStatus(401);
        }

        const topic = req.query.topic || req.query.type || req.body?.type;
        const paymentId = req.query["data.id"] || req.query.id || req.body?.data?.id;

        if ((topic === "payment" || topic === "payment.created" || topic === "payment.updated") && paymentId) {
            await actualizarPedidoDesdePago(paymentId);
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error("Error webhook Mercado Pago:", error.response?.data || error.message);
        return res.sendStatus(200);
    }
};

const registrarRetorno = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.pedidoId);

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        if (req.body?.payment_id) {
            try {
                await actualizarPedidoDesdePago(req.body.payment_id);
            } catch (error) {
                console.error("No se pudo consultar pago en retorno:", error.response?.data || error.message);
            }
        }

        const pedidoActualizado = await Pedido.findById(req.params.pedidoId).lean();

        if (pedidoActualizado.estado === "PENDIENTE" && req.body?.checkoutStatus === "failure") {
            await Pedido.findByIdAndUpdate(req.params.pedidoId, {
                estado: "FALLIDO",
                $push: {
                    historialEstados: {
                        estado: "FALLIDO",
                        detalle: "El cliente volvio desde una pantalla de pago fallido",
                        origen: "retorno",
                    },
                },
            });
        }

        return res.json({ message: "ok" });
    } catch (error) {
        return res.status(400).json({ message: "No se pudo registrar el retorno" });
    }
};

module.exports = {
    crearPreferencia,
    recibirWebhook,
    registrarRetorno,
};
