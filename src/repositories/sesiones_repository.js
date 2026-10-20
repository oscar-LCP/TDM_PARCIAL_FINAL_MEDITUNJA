const { db, ready } = require('../config/db');

const ejecutar = async (metodo, sql, parametros = []) => {
  await ready;
  return new Promise((resolve, reject) => {
    db[metodo](sql, parametros, function (error, resultado) {
      if (error) {
        reject(error);
        return;
      }
      resolve(metodo === 'run'
        ? { changes: this.changes, lastID: this.lastID }
        : resultado);
    });
  });
};

class SesionesRepository {
  async crear(idUsuario, tokenHash, ahora, expira) {
    await ejecutar(
      'run',
      `INSERT INTO sesiones (id_usuario, token_hash, creada_en, ultima_actividad, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, tokenHash, ahora, ahora, expira]
    );
  }

  async renovarSiActiva(tokenHash, ahora, nuevaExpiracion) {
    const resultado = await ejecutar(
      'run',
      `UPDATE sesiones
       SET ultima_actividad = ?, expira_en = ?
       WHERE token_hash = ? AND revocada_en IS NULL AND expira_en > ?
         AND EXISTS (
           SELECT 1
           FROM usuarios
           WHERE usuarios.id_usuario = sesiones.id_usuario
             AND usuarios.estado_registro = 'aprobado'
         )`,
      [ahora, nuevaExpiracion, tokenHash, ahora]
    );
    return resultado.changes === 1;
  }

  async buscarUsuarioActiva(tokenHash) {
    return ejecutar(
      'get',
      `SELECT s.expira_en, u.id_usuario, u.nombres, u.apellidos,
              u.tipo_documento, u.numero_documento, u.estado_registro
       FROM sesiones AS s
       JOIN usuarios AS u ON u.id_usuario = s.id_usuario
       WHERE s.token_hash = ? AND s.revocada_en IS NULL`,
      [tokenHash]
    );
  }
}

module.exports = new SesionesRepository();
