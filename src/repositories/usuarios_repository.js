const { db, ready } = require('../config/db');

const ejecutar = async (metodo, sql, parametros = []) => {
  await ready;
  return new Promise((resolve, reject) => {
    db[metodo](sql, parametros, function (error, resultado) {
      if (error) {
        reject(error);
        return;
      }
      resolve(metodo === 'run' ? { lastID: this.lastID } : resultado);
    });
  });
};

class UsuariosRepository {
  async buscarPorTipoYNumero(tipo_documento, numero_documento) {
    return ejecutar(
      'get',
      `SELECT id_usuario
       FROM usuarios
       WHERE tipo_documento = ? AND numero_documento = ?`,
      [tipo_documento, numero_documento]
    );
  }

  async buscarPorEmail(email) {
    return ejecutar(
      'get',
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );
  }

  async buscarCredenciales(tipo_documento, numero_documento) {
    return ejecutar(
      'get',
      `SELECT id_usuario, nombres, apellidos, tipo_documento,
              numero_documento, password_hash, estado_registro
       FROM usuarios
       WHERE tipo_documento = ? AND numero_documento = ?`,
      [tipo_documento, numero_documento]
    );
  }

  async crearPendiente(datos) {
    const { lastID } = await ejecutar(
      'run',
      `INSERT INTO usuarios (
         id_rol, tipo_documento, numero_documento, nombres, apellidos,
         email, telefono, password_hash, eps, ips, documento_eps,
         activo, estado_registro
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pendiente')`,
      [
        datos.id_rol,
        datos.tipo_documento,
        datos.numero_documento,
        datos.nombres,
        datos.apellidos,
        datos.email,
        datos.telefono,
        datos.password_hash,
        datos.eps,
        datos.ips,
        datos.documento_eps
      ]
    );

    return {
      id_usuario: lastID,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      email: datos.email,
      eps: datos.eps,
      ips: datos.ips,
      estado_registro: 'pendiente'
    };
  }
}

module.exports = new UsuariosRepository();
