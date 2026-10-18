const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const usuariosRepository = require('../repositories/usuarios.repository');

const scrypt = promisify(crypto.scrypt);
const TIPOS_DOCUMENTO_PERMITIDOS = new Set(['CC', 'TI', 'CE', 'PAS']);
const EPS_PERMITIDAS = new Set([
  'eps-vida-plena',
  'eps-salud-activa',
  'eps-bienestar-total',
  'eps-nueva-esperanza',
  'eps-integral',
  'particular'
]);
const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;
const CARPETA_DOCUMENTOS = path.resolve(__dirname, '../../uploads/eps');

const responderError = (res, status, error, mensaje) =>
  res.status(status).json({ error, mensaje });

const esTexto = (valor, maximo) =>
  typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= maximo;

const obtenerDocumento = (archivo) => {
  if (!archivo || typeof archivo !== 'object' || typeof archivo.data !== 'string') {
    return null;
  }

  if (archivo.data.length > Math.ceil(TAMANO_MAXIMO_ARCHIVO / 3) * 4 + 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(archivo.data)) {
    return null;
  }

  const contenido = Buffer.from(archivo.data, 'base64');
  if (contenido.length === 0 || contenido.length > TAMANO_MAXIMO_ARCHIVO ||
      contenido.toString('base64') !== archivo.data) {
    return null;
  }

  let extension;
  let tipoMime;
  if (contenido.subarray(0, 5).toString('ascii') === '%PDF-') {
    extension = 'pdf';
    tipoMime = 'application/pdf';
  } else if (contenido[0] === 0xff && contenido[1] === 0xd8 && contenido[2] === 0xff) {
    extension = 'jpg';
    tipoMime = 'image/jpeg';
  } else if (contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    extension = 'png';
    tipoMime = 'image/png';
  } else {
    return null;
  }

  const extensionDeclarada = path.extname(String(archivo.name || '')).slice(1).toLowerCase();
  const mimeDeclarado = String(archivo.type || '').toLowerCase();
  const extensionesValidas = extension === 'jpg' ? ['jpg', 'jpeg'] : [extension];
  if (!extensionesValidas.includes(extensionDeclarada) ||
      (mimeDeclarado && mimeDeclarado !== tipoMime)) {
    return null;
  }

  return { contenido, extension };
};

const crearHashContrasena = async (contrasena) => {
  const sal = crypto.randomBytes(16).toString('hex');
  const derivada = await scrypt(contrasena, sal, 64);
  return `${sal}:${derivada.toString('hex')}`;
};

const registrarUsuario = async (req, res) => {
  let rutaDocumentoGuardado;
  try {
    const {
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      email,
      telefono,
      contrasena,
      eps,
      documento_eps: archivo
    } = req.body;

    if (!esTexto(nombres, 80) || !esTexto(apellidos, 80) ||
        !esTexto(numero_documento, 20) || !esTexto(email, 254) ||
        typeof contrasena !== 'string' || contrasena.length < 8 || contrasena.length > 128 ||
        typeof eps !== 'string') {
      return responderError(res, 400, 'Datos inválidos', 'Revisa los campos obligatorios y sus longitudes.');
    }

    const tipoDoc = String(tipo_documento).trim().toUpperCase();
    const numDoc = String(numero_documento).trim();
    const correo = String(email).trim().toLowerCase();
    const nombre = nombres.trim();
    const apellido = apellidos.trim();
    const epsSeleccionada = eps.trim();
    const telefonoNormalizado = telefono == null ? '' : String(telefono).trim();

    if (!TIPOS_DOCUMENTO_PERMITIDOS.has(tipoDoc)) {
      return responderError(res, 400, 'Tipo de documento inválido', 'Selecciona un tipo de documento permitido.');
    }

    if (!/^[A-Za-z0-9.-]{4,20}$/.test(numDoc) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
        !EPS_PERMITIDAS.has(epsSeleccionada) ||
        (telefonoNormalizado && !/^\+?[0-9\s()-]{7,20}$/.test(telefonoNormalizado))) {
      return responderError(res, 400, 'Datos inválidos', 'Revisa el documento, correo, teléfono y EPS seleccionados.');
    }

    let documento = null;
    if (epsSeleccionada !== 'particular') {
      documento = obtenerDocumento(archivo);
      if (!documento) {
        return responderError(res, 400, 'Documento EPS inválido', 'Adjunta un PDF, JPG o PNG válido de máximo 5 MB.');
      }
    } else if (archivo) {
      return responderError(res, 400, 'Adjunto no permitido', 'No adjuntes documento si seleccionas Particular.');
    }

    const existeDocumento = await usuariosRepository.buscarPorTipoYNumero(tipoDoc, numDoc);
    if (existeDocumento) {
      return responderError(res, 409, 'Documento duplicado', 'Ya existe un usuario con ese documento.');
    }

    const existeEmail = await usuariosRepository.buscarPorEmail(correo);
    if (existeEmail) {
      return responderError(res, 409, 'Correo duplicado', 'Ese correo ya está registrado.');
    }

    if (documento) {
      await fs.mkdir(CARPETA_DOCUMENTOS, { recursive: true });
      rutaDocumentoGuardado = path.join(CARPETA_DOCUMENTOS, `${crypto.randomUUID()}.${documento.extension}`);
      await fs.writeFile(rutaDocumentoGuardado, documento.contenido, { flag: 'wx', mode: 0o600 });
    }

    const nuevoUsuario = await usuariosRepository.crearPendiente({
      id_rol: 1,
      tipo_documento: tipoDoc,
      numero_documento: numDoc,
      nombres: nombre,
      apellidos: apellido,
      email: correo,
      telefono: telefonoNormalizado || null,
      eps: epsSeleccionada,
      password_hash: await crearHashContrasena(contrasena),
      documento_eps: rutaDocumentoGuardado ? path.basename(rutaDocumentoGuardado) : null
    });

    return res.status(201).json({
      mensaje: 'Solicitud de registro guardada en estado pendiente.',
      data: {
        id_usuario: nuevoUsuario.id_usuario,
        nombres: nuevoUsuario.nombres,
        apellidos: nuevoUsuario.apellidos,
        email: nuevoUsuario.email,
        estado_registro: nuevoUsuario.estado_registro
      }
    });
  } catch (error) {
    if (rutaDocumentoGuardado) await fs.unlink(rutaDocumentoGuardado).catch(() => {});
    console.error('Error en POST /api/registro:', error);
    return responderError(res, 500, 'Error interno del servidor', 'Ocurrió un error al procesar la solicitud.');
  }
};

module.exports = { registrarUsuario };