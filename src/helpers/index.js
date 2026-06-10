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

const buscarPersonaDuplicada = async ({ idExcluir, nombre, apellido, email, dni }) => {
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

    return Usuario.findOne({
        _id: { $ne: idExcluir },
        $or: condiciones
    });
};

module.exports = {
    escaparRegex,
    normalizarTexto,
    formatearCodigo,
    normalizarCodigoPersona,
    tieneTelefono,
    buscarPersonaDuplicada,
};