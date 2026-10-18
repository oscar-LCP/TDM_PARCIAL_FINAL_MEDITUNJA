//Pruebas de usuarios, mientras no se conecte a una base de datos real, se simula con un arreglo en memoria.
const usuariosSeed = [
  {
    id_usuario: 1,
    id_rol: 1,
    id_aseguradora: 1,
    tipo_documento: 'CC',
    numero_documento: '1049650111',
    nombres: 'Camila Andrea',
    apellidos: 'Rojas Vargas',
    email: 'camila.rojas@correo.com',
    telefono: '3105550101',
    activo: true,
    estado_registro: 'aprobado',
    fecha_registro: '2026-10-18T12:00:00.000Z'
  },
  {
    id_usuario: 2,
    id_rol: 2,
    id_aseguradora: null,
    tipo_documento: 'CC',
    numero_documento: '74185296',
    nombres: 'Alejandro',
    apellidos: 'Martínez Gómez',
    email: 'dr.martinez@clinica.com',
    telefono: '3155550202',
    activo: true,
    estado_registro: 'aprobado',
    fecha_registro: '2026-10-18T12:00:00.000Z'
  },
  {
    id_usuario: 3,
    id_rol: 3,
    id_aseguradora: null,
    tipo_documento: 'CC',
    numero_documento: '1052398741',
    nombres: 'Javier',
    apellidos: 'Castro Niño',
    email: 'javier.conductor@flota.com',
    telefono: '3205550303',
    activo: true,
    estado_registro: 'aprobado',
    fecha_registro: '2026-10-18T12:00:00.000Z'
  }
];

let usuariosDB = [...usuariosSeed];

class UsuariosRepository {
  async buscarPorTipoYNumero(tipo_documento, numero_documento) {
    return (
      usuariosDB.find(
        (u) =>
          u.tipo_documento === tipo_documento &&
          u.numero_documento === numero_documento
      ) || null
    );
  }

  async buscarPorEmail(email) {
    return usuariosDB.find((u) => u.email === email) || null;
  }

  async crearPendiente(datos) {
    const nuevoUsuario = {
      id_usuario: usuariosDB.length + 1,
      id_rol: datos.id_rol ?? 1,
      id_aseguradora: datos.id_aseguradora ?? null,
      tipo_documento: datos.tipo_documento,
      numero_documento: datos.numero_documento,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      email: datos.email,
      telefono: datos.telefono ?? null,
      eps: datos.eps,
      password_hash: datos.password_hash,
      documento_eps: datos.documento_eps ?? null,
      activo: false,
      estado_registro: 'pendiente',
      fecha_registro: new Date().toISOString()
    };

    usuariosDB.push(nuevoUsuario);
    return nuevoUsuario;
  }
}

module.exports = new UsuariosRepository();