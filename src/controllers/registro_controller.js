const usuariosRepository = require('../repositories/usuarios.repository');

const TIPOS_DOCUMENTO_PERMITIDOS = ['CC', 'TI', 'CE', 'PAS', 'NIT'];

const registrarUsuario = async (req, res) => {
  try {
    const {
      id_rol = 1,
      id_aseguradora = null,
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      email,
      telefono = null
    } = req.body;

    if (!tipo_documento || !numero_documento || !nombres || !apellidos || !email) {
      return res.status(400).json({
        error: 'Datos obligatorios incompletos',
        mensaje: 'Los campos tipo_documento, numero_documento, nombres, apellidos y email son requeridos.'
      });
    }

    const tipoDoc = String(tipo_documento).trim().toUpperCase();
    const numDoc = String(numero_documento).trim();
    const correo = String(email).trim().toLowerCase();

    if (!TIPOS_DOCUMENTO_PERMITIDOS.includes(tipoDoc)) {
      return res.status(400).json({
        error: 'Tipo de documento inválido',
        mensaje: `El campo tipo_documento debe ser uno de: ${TIPOS_DOCUMENTO_PERMITIDOS.join(', ')}.`
      });
    }

    // Rechaza los documentos duplicados (tipo + número)
    const existeDocumento = await usuariosRepository.buscarPorTipoYNumero(tipoDoc, numDoc);
    if (existeDocumento) {
      return res.status(409).json({
        error: 'Documento duplicado',
        mensaje: `Ya existe un usuario registrado con el documento ${tipoDoc} ${numDoc}.`
      });
    }

    // Rechaza un email duplicado
    const existeEmail = await usuariosRepository.buscarPorEmail(correo);
    if (existeEmail) {
      return res.status(409).json({
        error: 'Correo electrónico duplicado',
        mensaje: `El correo ${correo} ya se encuentra registrado en el sistema.`
      });
    }

    // Guardar la solicitud como pendiente
    const nuevoUsuario = await usuariosRepository.crearPendiente({
      id_rol: Number(id_rol),
      id_aseguradora: id_aseguradora ? Number(id_aseguradora) : null,
      tipo_documento: tipoDoc,
      numero_documento: numDoc,
      nombres: String(nombres).trim(),
      apellidos: String(apellidos).trim(),
      email: correo,
      telefono: telefono ? String(telefono).trim() : null
    });

    return res.status(201).json({
      mensaje: 'Solicitud de registro guardada en estado pendiente.',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('Error en POST /api/registro:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'Ocurrió un error al procesar la solicitud de registro.'
    });
  }
};

module.exports = { registrarUsuario };