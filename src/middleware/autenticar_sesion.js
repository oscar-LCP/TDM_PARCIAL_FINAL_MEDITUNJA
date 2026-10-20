const crypto = require('node:crypto');
const sesionesRepository = require('../repositories/sesiones_repository');

const DURACION_SESION_MS = 30 * 60 * 1000;

const autenticarSesion = async (req, res, next) => {
  const autorizacion = req.get('authorization') || '';
  const coincidencia = /^Bearer ([a-f0-9]{64})$/i.exec(autorizacion);

  if (!coincidencia) {
    return res.status(401).json({
      error: 'Sesión requerida',
      mensaje: 'Envía un token de sesión válido en Authorization: Bearer <token>.'
    });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(coincidencia[1]).digest('hex');
    const ahora = Date.now();
    const nuevaExpiracion = ahora + DURACION_SESION_MS;
    const renovada = await sesionesRepository.renovarSiActiva(
      tokenHash,
      ahora,
      nuevaExpiracion
    );

    if (!renovada) {
      return res.status(401).json({
        error: 'Sesión expirada o inválida',
        mensaje: 'Inicia sesión nuevamente para continuar.'
      });
    }

    const usuario = await sesionesRepository.buscarUsuarioActiva(tokenHash);
    if (!usuario || usuario.estado_registro !== 'aprobado') {
      return res.status(401).json({
        error: 'Sesión no disponible',
        mensaje: 'La cuenta ya no está habilitada. Inicia sesión nuevamente.'
      });
    }

    req.usuario = {
      id_usuario: usuario.id_usuario,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      tipo_documento: usuario.tipo_documento,
      numero_documento: usuario.numero_documento,
      estado_registro: usuario.estado_registro
    };
    req.sesionExpiraEn = nuevaExpiracion;
    return next();
  } catch (error) {
    console.error('Error al validar sesión:', error.code || 'ERROR_INTERNO');
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: 'Ocurrió un error al validar la sesión.'
    });
  }
};

module.exports = autenticarSesion;
