const Usuario = require('../models/persona');
const UsuarioAuth = require('../models/usuarioAuth');
const CryptoJS = require('crypto-js');
const { enviarBienvenida } = require('../services/emailService');

const normalizarTexto = (value) => String(value || '').trim();

const tieneTelefonoCliente = (telefono) => (
    Boolean(normalizarTexto(telefono?.area)) && Boolean(normalizarTexto(telefono?.numero))
);

// Crea usuario
const registrarse = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            dni,
            email,
            password,
            foto,
            telefono,
            direccion,
            rol,
            rolAsignado
        } = req.body;

        const rolFinal = normalizarTexto(rol || rolAsignado || 'CLIENTE').toUpperCase();
        const esCliente = rolFinal === 'CLIENTE';
        const nombreTrim = normalizarTexto(nombre);
        const apellidoTrim = normalizarTexto(apellido);
        const dniTexto = normalizarTexto(dni);
        const emailLower = normalizarTexto(email).toLowerCase();

        if (rolFinal !== 'CLIENTE') {
            return res.status(400).json({ message: 'El registro publico solo permite crear clientes' });
        }

        if (!nombreTrim || !apellidoTrim || !emailLower || !normalizarTexto(password) || !tieneTelefonoCliente(telefono)) {
            return res.status(400).json({
                message: 'Nombre, apellido, email, contrasena, area y telefono son obligatorios'
            });
        }

        if (normalizarTexto(password).length < 6) {
            return res.status(400).json({ message: 'La contrasena debe tener al menos 6 caracteres' });
        }

        if (!process.env.PASS_SEC) {
            console.error('Falta la variable PASS_SEC en el archivo .env');
            return res.status(500).json({
                message: 'Error en configuracion del servidor. Faltan variables de entorno.'
            });
        }

        const nombreLower = nombreTrim.toLowerCase();
        const apellidoLower = apellidoTrim.toLowerCase();

        const existeNombreApellido = await Usuario.findOne({
            nombre: { $regex: new RegExp(`^${nombreLower}$`, 'i') },
            apellido: { $regex: new RegExp(`^${apellidoLower}$`, 'i') },
        });
        if (existeNombreApellido) {
            return res.status(400).json({
                message: `Ya existe un usuario con el nombre y apellido: ${nombreTrim} ${apellidoTrim}`
            });
        }

        if (emailLower) {
            const existeEmail = await Usuario.findOne({
                email: { $regex: new RegExp(`^${emailLower}$`, 'i') },
            });
            if (existeEmail) {
                return res.status(400).json({
                    message: `Ya existe un usuario con el email: ${email}`
                });
            }
        }

        if (dniTexto) {
            const existeDNI = await Usuario.findOne({ dni: Number(dniTexto) });
            if (existeDNI) {
                return res.status(400).json({
                    message: `Ya existe un usuario con el DNI: ${dni}`
                });
            }
        }

        const existeTel = await Usuario.findOne({ 'telefono.numero': telefono.numero });
        if (existeTel) {
            return res.status(400).json({
                message: `Ya existe un usuario con el telefono: ${telefono.numero}`
            });
        }

        const authExistente = await UsuarioAuth.findOne({ email: emailLower });
        if (authExistente) {
            return res.status(400).json({
                message: `Ya existe un acceso con el email: ${email}`
            });
        }

        const passwordEncript = CryptoJS.AES.encrypt(
            normalizarTexto(password),
            process.env.PASS_SEC
        ).toString();

        const newUsuario = new Usuario({
            nombre: nombreTrim,
            apellido: apellidoTrim,
            dni: dniTexto ? Number(dniTexto) : undefined,
            email: emailLower || undefined,
            password: passwordEncript,
            foto: foto || '',
            telefono: {
                area: normalizarTexto(telefono?.area),
                numero: normalizarTexto(telefono?.numero)
            },
            direccion,
            rol: rolFinal,
            nombreApellido: `${nombreTrim} ${apellidoTrim}`,
        });

        await newUsuario.save();

        let usuarioAuth = null;
        let emailEnviado = true;

        try {
            usuarioAuth = await UsuarioAuth.create({
                personaId: newUsuario._id,
                email: emailLower,
                password: passwordEncript,
                roles: ['CLIENTE'],
                permisos: [],
                debeCambiarPassword: false,
            });
        } catch (error) {
            await Usuario.findByIdAndDelete(newUsuario._id);
            throw error;
        }

        try {
            await enviarBienvenida({
                email: newUsuario.email,
                nombre: `${newUsuario.nombre || ''} ${newUsuario.apellido || ''}`.trim()
            });
        } catch (error) {
            emailEnviado = false;
            console.error('Error enviando bienvenida registrarse:', error.response?.data || error.message);
        }

        return res.status(201).json({
            message: emailEnviado
                ? 'Usuario creado correctamente'
                : 'Usuario creado correctamente, pero no se pudo enviar el email de bienvenida',
            emailEnviado,
            usuario: {
                id: newUsuario._id,
                authId: usuarioAuth._id,
                nombre: newUsuario.nombre,
                apellido: newUsuario.apellido,
                email: newUsuario.email,
                rol: newUsuario.rol
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = { registrarse };
