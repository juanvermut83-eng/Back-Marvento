const Persona = require("../models/persona");
const UsuarioAuth = require("../models/usuarioAuth")
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const {
    enviarAltaUsuarioSistema,
    enviarBienvenida,
    enviarRecuperacionPassword
} = require('../services/emailService');

const escaparRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizarTexto = (value) => String(value || '').trim();
const formatearCodigo = (value) => String(Number(value || 0)).padStart(4, '0');
const normalizarCodigoPersona = (value) => {
    const texto = normalizarTexto(value);
    if (!texto) return '';
    const numero = Number(texto);
    return Number.isFinite(numero) ? formatearCodigo(numero) : texto.toUpperCase();
};

const tieneTelefono = (telefono) => {
    if (typeof telefono === 'string') {
        return Boolean(normalizarTexto(telefono));
    }

    return Boolean(normalizarTexto(telefono?.area)) && Boolean(normalizarTexto(telefono?.numero ?? telefono?.telefono));
};

const getProximoNumeroPersona = async (rol, campo) => {
    const personas = await Persona.find({
        rol,
        [campo]: { $exists: true, $ne: null }
    }).select(campo).lean();

    const ultimoNumero = personas.reduce((max, persona) => {
        const numero = Number(persona?.[campo] || 0);
        return Number.isFinite(numero) && numero > max ? numero : max;
    }, 0);

    return formatearCodigo(ultimoNumero + 1);
};

const buscarPersonaDuplicada = async ({ nombre, apellido, email, dni }) => {
    const nombreNormalizado = normalizarTexto(nombre);
    const apellidoNormalizado = normalizarTexto(apellido);
    const emailNormalizado = normalizarTexto(email).toLowerCase();
    const dniTexto = normalizarTexto(dni);
    const dniNum = dniTexto ? Number(dniTexto) : null;

    const condiciones = [];

    if (emailNormalizado) condiciones.push({ email: emailNormalizado });
    if (Number.isFinite(dniNum)) condiciones.push({ dni: dniNum });
    if (nombreNormalizado && apellidoNormalizado) {
        condiciones.push({
            nombre: { $regex: `^${escaparRegex(nombreNormalizado)}$`, $options: 'i' },
            apellido: { $regex: `^${escaparRegex(apellidoNormalizado)}$`, $options: 'i' }
        });
    }

    if (!condiciones.length) return null;
    return Persona.findOne({ $or: condiciones });
};

const crearTokenUsuario = (user) => jwt.sign(
    {
        id: user._id,
        roles: user.roles,
    },
    process.env.JWT_SEC,
);

const hashToken = (token) => crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');

const getResetPasswordUrl = (token) => {
    const baseUrl = normalizarTexto(process.env.FRONTEND_URL) || 'http://localhost:5173';
    const path = normalizarTexto(process.env.RESET_PASSWORD_PATH) || '/reset-password';
    const url = new URL(path, baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
};

const getNombrePersona = (persona) => normalizarTexto(`${persona?.nombre || ''} ${persona?.apellido || ''}`);

const formatearUsuarioAuth = (user, token) => {
    const persona = user.personaId;

    return {
        id: user._id,
        personaId: persona._id,
        email: user.email,
        nombre: persona.nombre,
        apellido: persona.apellido,
        telefono: persona.telefono,
        direccion: persona.direccion,
        roles: user.roles,
        permisos: user.permisos || persona.permisos || [],
        debeCambiarPassword: Boolean(user.debeCambiarPassword),
        token
    };
};


//login clásico
const separarNombreGoogle = (payload = {}) => {
    const nombreGoogle = normalizarTexto(payload.given_name);
    const apellidoGoogle = normalizarTexto(payload.family_name);

    if (nombreGoogle || apellidoGoogle) {
        return {
            nombre: nombreGoogle || normalizarTexto(payload.name) || 'Cliente',
            apellido: apellidoGoogle || 'Google'
        };
    }

    const partes = normalizarTexto(payload.name).split(/\s+/).filter(Boolean);

    return {
        nombre: partes[0] || 'Cliente',
        apellido: partes.slice(1).join(' ') || 'Google'
    };
};

const crearClienteGoogle = async ({ email, payload }) => {
    if (!process.env.PASS_SEC) {
        throw new Error('Falta PASS_SEC para crear usuario Google');
    }

    const { nombre, apellido } = separarNombreGoogle(payload);
    let persona = await Persona.findOne({ email });

    if (!persona) {
        const numeroCliente = await getProximoNumeroPersona("CLIENTE", "numeroCliente");

        persona = await Persona.create({
            nombre,
            apellido,
            email,
            numeroCliente,
            rol: "CLIENTE",
            nombreApellido: `${nombre} ${apellido}`
        });
    }

    const passwordGoogle = CryptoJS.AES.encrypt(
        `google:${email}:${Date.now()}`,
        process.env.PASS_SEC
    ).toString();

    const usuarioAuth = await UsuarioAuth.create({
        personaId: persona._id,
        email,
        password: passwordGoogle,
        roles: ["CLIENTE"],
        permisos: [],
        debeCambiarPassword: false
    });

    enviarBienvenida({
        email,
        nombre: getNombrePersona(persona)
    }).catch((error) => console.error('Error enviando bienvenida Google:', error.response?.data || error.message));

    return usuarioAuth;
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UsuarioAuth.findOne({ email })
            .populate("personaId");

        if (!user || !user.activo) {
            return res.status(401).json({
                message: "Email incorrecto"
            });
        }

        const hashedPassword = CryptoJS.AES.decrypt(
            user.password,
            process.env.PASS_SEC
        );

        const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);

        if (originalPassword !== password) {
            return res.status(401).json({
                message: "Contraseña incorrecta"
            });
        }

        const token = crearTokenUsuario(user);

        return res.status(200).json({
            message: "ok",
            user: formatearUsuarioAuth(user, token)
        });

    } catch (error) {
        console.error("Error login:", error);
        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

const loginGoogle = async (req, res) => {
    try {
        const credential = req.body?.credential || req.body?.tokenId;

        if (!credential) {
            return res.status(400).json({
                message: "Falta credential de Google"
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({
                message: "Google Login no esta configurado en el servidor"
            });
        }

        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = String(payload?.email || '').trim().toLowerCase();

        if (!email || !payload?.email_verified) {
            return res.status(401).json({
                message: "Google no pudo verificar el email"
            });
        }

        let user = await UsuarioAuth.findOne({ email })
            .populate("personaId");

        if (!user) {
            user = await crearClienteGoogle({ email, payload });
            user = await UsuarioAuth.findById(user._id).populate("personaId");
        }

        if (!user.activo) {
            return res.status(401).json({
                message: "El usuario no esta habilitado"
            });
        }

        const token = crearTokenUsuario(user);

        return res.status(200).json({
            message: "ok",
            user: formatearUsuarioAuth(user, token)
        });
    } catch (error) {
        console.error("Error Google login:", error);
        return res.status(401).json({
            message: "No se pudo validar la cuenta de Google"
        });
    }
};

const solicitarRecuperacionPassword = async (req, res) => {
    try {
        const email = normalizarTexto(req.body?.email).toLowerCase();

        if (!email) {
            return res.status(400).json({ message: "Email obligatorio" });
        }

        const respuestaGenerica = {
            message: "Si el email esta registrado, enviaremos instrucciones para recuperar la contrasena."
        };
        const user = await UsuarioAuth.findOne({ email }).populate("personaId");

        if (!user || !user.activo) {
            return res.status(200).json(respuestaGenerica);
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = hashToken(token);
        user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        await enviarRecuperacionPassword({
            email: user.email,
            nombre: getNombrePersona(user.personaId),
            resetUrl: getResetPasswordUrl(token),
        });

        return res.status(200).json(respuestaGenerica);
    } catch (error) {
        console.error("Error solicitando recuperacion de password:", error.response?.data || error.message);
        return res.status(500).json({
            message: "No se pudo enviar el email de recuperacion"
        });
    }
};

const resetearPasswordConToken = async (req, res) => {
    try {
        const token = normalizarTexto(req.body?.token);
        const password = normalizarTexto(req.body?.password);

        if (!token || password.length < 6) {
            return res.status(400).json({
                message: "Token y contrasena nueva de al menos 6 caracteres son obligatorios"
            });
        }

        if (!process.env.PASS_SEC) {
            return res.status(500).json({ message: "Error de configuracion" });
        }

        const user = await UsuarioAuth.findOne({
            resetPasswordToken: hashToken(token),
            resetPasswordExpiresAt: { $gt: new Date() },
            activo: true
        }).populate("personaId");

        if (!user) {
            return res.status(400).json({
                message: "El enlace de recuperacion es invalido o expiro"
            });
        }

        const passwordEncriptada = CryptoJS.AES.encrypt(
            password,
            process.env.PASS_SEC
        ).toString();

        user.password = passwordEncriptada;
        user.debeCambiarPassword = false;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();

        if (user.personaId) {
            user.personaId.password = passwordEncriptada;
            await user.personaId.save();
        }

        return res.status(200).json({
            message: "Contrasena actualizada correctamente"
        });
    } catch (error) {
        console.error("Error reseteando password con token:", error);
        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};


//registrar usuarios
const registrar = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            dni,
            email,
            password,
            telefono,
            direccion,
            nota,
            numeroCliente,
            numeroProveedor,
            rol = "CLIENTE" // default
        } = req.body;

        // Validaciones básicas
        const nombreTrim = normalizarTexto(nombre);
        const apellidoTrim = normalizarTexto(apellido);
        const emailLower = normalizarTexto(email).toLowerCase();
        const dniTexto = normalizarTexto(dni);
        const dniNum = dniTexto ? Number(dniTexto) : null;
        const rolUpper = rol.toUpperCase();
        const esClienteOProveedor = rolUpper === "CLIENTE" || rolUpper === "PROVEEDOR";

        if (!nombreTrim || !apellidoTrim || (!esClienteOProveedor && !emailLower)) {
            return res.status(400).json({
                message: esClienteOProveedor ? "Nombre y apellido son obligatorios" : "Faltan campos obligatorios"
            });
        }

        if (rolUpper === "CLIENTE" && !tieneTelefono(telefono)) {
            return res.status(400).json({
                message: "Nombre, apellido, area y telefono son obligatorios para clientes"
            });
        }

        if (dniTexto && !Number.isFinite(dniNum)) {
            return res.status(400).json({
                message: "DNI invalido"
            });
        }

        // Validar rol permitido
        const rolesPermitidos = ["ADMIN", "EMPLEADO", "CLIENTE", "PROVEEDOR"];
        if (!rolesPermitidos.includes(rolUpper)) {
            return res.status(400).json({
                message: "Rol inválido"
            });
        }

        // Verificar duplicados
        const existePersona = await buscarPersonaDuplicada({
            nombre: nombreTrim,
            apellido: apellidoTrim,
            dni: dniTexto ? dniNum : undefined,
            email: emailLower || undefined
        });

        if (existePersona) {
            return res.status(400).json({
                message: "Ya existe una persona con ese nombre y apellido, DNI o email"
            });
        }

        const esUsuarioSistema = rolUpper === "ADMIN" || rolUpper === "EMPLEADO";
        let authExistente = null;
        const passwordSistema = normalizarTexto(password);

        if (esUsuarioSistema) {
            if (!process.env.PASS_SEC) {
                return res.status(500).json({
                    message: "Error de configuracion"
                });
            }

            authExistente = await UsuarioAuth.findOne({ email: emailLower });
            if (authExistente) {
                const personaAuth = await Persona.findById(authExistente.personaId).select('_id');
                if (personaAuth) {
                    return res.status(400).json({
                        message: "Ya existe un usuario de acceso con ese email"
                    });
                }

                await UsuarioAuth.deleteOne({ _id: authExistente._id });
            }

            if (passwordSistema.length < 6) {
                return res.status(400).json({
                    message: "La contraseña temporal debe tener al menos 6 caracteres"
                });
            }
        }

        const numeroClienteFinal = rolUpper === "CLIENTE"
            ? (normalizarCodigoPersona(numeroCliente) || await getProximoNumeroPersona("CLIENTE", "numeroCliente"))
            : normalizarCodigoPersona(numeroCliente);

        const numeroProveedorFinal = rolUpper === "PROVEEDOR"
            ? (normalizarCodigoPersona(numeroProveedor) || await getProximoNumeroPersona("PROVEEDOR", "numeroProveedor"))
            : normalizarCodigoPersona(numeroProveedor);

        const passwordEncript = esUsuarioSistema
            ? CryptoJS.AES.encrypt(
                passwordSistema,
                process.env.PASS_SEC
            ).toString()
            : undefined;

        // Crear Persona
        const persona = await Persona.create({
            nombre: nombreTrim,
            apellido: apellidoTrim,
            dni: dniTexto ? dniNum : undefined,
            email: emailLower || undefined,
            password: passwordEncript,
            telefono,
            direccion,
            nota,
            numeroCliente: numeroClienteFinal,
            numeroProveedor: numeroProveedorFinal,
            rol: rolUpper,
            nombreApellido: `${nombreTrim} ${apellidoTrim}`
        });

        // Crear UsuarioAuth SOLO si es usuario del sistema
        let usuarioAuth = null;
        let emailEnviado = null;

        if (esUsuarioSistema) {
            try {
                usuarioAuth = await UsuarioAuth.create({
                    personaId: persona._id,
                    email: emailLower,
                    password: passwordEncript,
                    roles: [rolUpper],
                    permisos: [],
                    debeCambiarPassword: true
                });

                emailEnviado = true;
                try {
                    await enviarAltaUsuarioSistema({
                        email: emailLower,
                        nombre: getNombrePersona(persona),
                        passwordTemporal: passwordSistema,
                        rol: rolUpper
                    });
                } catch (error) {
                    emailEnviado = false;
                    console.error('Error enviando alta de usuario:', error.response?.data || error.message);
                }
            } catch (error) {
                await Persona.findByIdAndDelete(persona._id);
                throw error;
            }
        } else if (emailLower) {
            emailEnviado = true;
            try {
                await enviarBienvenida({
                    email: emailLower,
                    nombre: getNombrePersona(persona)
                });
            } catch (error) {
                emailEnviado = false;
                console.error('Error enviando bienvenida:', error.response?.data || error.message);
            }
        }

        return res.status(201).json({
            message: emailEnviado === false
                ? "Registro exitoso, pero no se pudo enviar el email"
                : "Registro exitoso",
            emailEnviado,
            persona,
            usuarioAuth
        });

    } catch (error) {
        console.error("Error al registrar:", error);
        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

const obtenerSiguienteCodigoPersona = async (req, res) => {
    try {
        const rol = String(req.query?.rol || req.params?.rol || '').toUpperCase();

        if (!['CLIENTE', 'PROVEEDOR'].includes(rol)) {
            return res.status(400).json({ msg: 'Rol invalido. Use CLIENTE o PROVEEDOR' });
        }

        const campo = rol === 'PROVEEDOR' ? 'numeroProveedor' : 'numeroCliente';
        const codigo = await getProximoNumeroPersona(rol, campo);

        return res.json({
            rol,
            campo,
            codigo,
            siguiente: codigo
        });
    } catch (error) {
        return res.status(500).json({ msg: 'Error al obtener siguiente codigo', error: error.message });
    }
};


module.exports = {
    login,
    loginGoogle,
    solicitarRecuperacionPassword,
    resetearPasswordConToken,
    registrar,
    obtenerSiguienteCodigoPersona
}
