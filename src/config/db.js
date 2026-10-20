const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const rutaBaseDatos = path.resolve(
  process.env.DB_PATH || path.join(__dirname, '../../data/meditunja.db')
);
const rutaEsquema = path.join(__dirname, 'db.sql');

fs.mkdirSync(path.dirname(rutaBaseDatos), { recursive: true });

let resolverInicializacion;
let rechazarInicializacion;
const ready = new Promise((resolve, reject) => {
  resolverInicializacion = resolve;
  rechazarInicializacion = reject;
});

let db;
const cerrarYRechazar = (error) => {
  db.close((errorCierre) => {
    if (errorCierre) error.cause = errorCierre;
    rechazarInicializacion(error);
  });
};

const asegurarColumnaIps = () => {
  db.all('PRAGMA table_info(usuarios)', (error, columnas) => {
    if (error) {
      cerrarYRechazar(error);
      return;
    }

    if (columnas.some(({ name }) => name === 'ips')) {
      asegurarEPSyIPSRequeridas();
      return;
    }

    db.run('ALTER TABLE usuarios ADD COLUMN ips VARCHAR(100)', (errorMigracion) => {
      if (errorMigracion) {
        cerrarYRechazar(errorMigracion);
        return;
      }
      asegurarEPSyIPSRequeridas();
    });
  });
};

const crearValidacionesEPSyIPS = () => {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS usuarios_requiere_eps_ips_insert
    BEFORE INSERT ON usuarios
    WHEN NEW.eps IS NULL OR length(trim(NEW.eps)) = 0
      OR NEW.ips IS NULL OR length(trim(NEW.ips)) = 0
    BEGIN
      SELECT RAISE(ABORT, 'EPS e IPS son requeridas');
    END;

    CREATE TRIGGER IF NOT EXISTS usuarios_requiere_eps_ips_update
    BEFORE UPDATE OF eps, ips ON usuarios
    WHEN NEW.eps IS NULL OR length(trim(NEW.eps)) = 0
      OR NEW.ips IS NULL OR length(trim(NEW.ips)) = 0
    BEGIN
      SELECT RAISE(ABORT, 'EPS e IPS son requeridas');
    END;
  `, (error) => {
    if (error) {
      cerrarYRechazar(error);
      return;
    }

    db.all('PRAGMA foreign_key_check', (errorVerificacion, violaciones) => {
      if (errorVerificacion) {
        cerrarYRechazar(errorVerificacion);
      } else if (violaciones.length > 0) {
        cerrarYRechazar(new Error('La migración de usuarios produjo referencias foráneas inválidas.'));
      } else {
        asegurarHashesContrasena();
      }
    });
  });
};

const asegurarHashesContrasena = () => {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS usuarios_requiere_password_hash_insert
    BEFORE INSERT ON usuarios
    WHEN length(NEW.password_hash) != 161
      OR substr(NEW.password_hash, 33, 1) != ':'
      OR substr(NEW.password_hash, 1, 32) GLOB '*[^a-fA-F0-9]*'
      OR substr(NEW.password_hash, 34, 128) GLOB '*[^a-fA-F0-9]*'
    BEGIN
      SELECT RAISE(ABORT, 'password_hash debe contener salt y hash');
    END;

    CREATE TRIGGER IF NOT EXISTS usuarios_requiere_password_hash_update
    BEFORE UPDATE OF password_hash ON usuarios
    WHEN length(NEW.password_hash) != 161
      OR substr(NEW.password_hash, 33, 1) != ':'
      OR substr(NEW.password_hash, 1, 32) GLOB '*[^a-fA-F0-9]*'
      OR substr(NEW.password_hash, 34, 128) GLOB '*[^a-fA-F0-9]*'
    BEGIN
      SELECT RAISE(ABORT, 'password_hash debe contener salt y hash');
    END;
  `, (error) => {
    if (error) {
      cerrarYRechazar(error);
      return;
    }

    db.get(
      `SELECT COUNT(*) AS cantidad
       FROM usuarios
       WHERE length(password_hash) != 161
          OR substr(password_hash, 33, 1) != ':'
          OR substr(password_hash, 1, 32) GLOB '*[^a-fA-F0-9]*'
          OR substr(password_hash, 34, 128) GLOB '*[^a-fA-F0-9]*'`,
      (errorVerificacion, resultado) => {
        if (errorVerificacion) {
          cerrarYRechazar(errorVerificacion);
        } else if (resultado.cantidad > 0) {
          cerrarYRechazar(new Error(
            'La base de datos contiene contraseñas sin hash y salt. Corrige esos registros antes de iniciar.'
          ));
        } else {
          resolverInicializacion(db);
        }
      }
    );
  });
};

const migrarRestriccionEPSyIPS = () => {
  db.get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'",
    (error, tabla) => {
      if (error) {
        cerrarYRechazar(error);
        return;
      }

      const definicion = (tabla && tabla.sql || '').toLowerCase();
      const tieneRestriccionExclusiva =
        /eps\s+is\s+not\s+null\s+and\s+ips\s+is\s+null/.test(definicion) &&
        /eps\s+is\s+null\s+and\s+ips\s+is\s+not\s+null/.test(definicion);

      if (!tieneRestriccionExclusiva) {
        crearValidacionesEPSyIPS();
        return;
      }

      db.exec(`
        PRAGMA foreign_keys = OFF;
        BEGIN IMMEDIATE;
        CREATE TABLE usuarios_nueva (
          id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
          id_rol INTEGER NOT NULL DEFAULT 1,
          id_aseguradora INTEGER,
          tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'PAS', 'NIT')),
          numero_documento VARCHAR(30) NOT NULL,
          nombres VARCHAR(100) NOT NULL,
          apellidos VARCHAR(100) NOT NULL,
          email VARCHAR(120) NOT NULL UNIQUE,
          telefono VARCHAR(30),
          password_hash TEXT NOT NULL,
          eps VARCHAR(40),
          ips VARCHAR(100),
          documento_eps VARCHAR(255),
          activo BOOLEAN DEFAULT 0,
          estado_registro VARCHAR(20) NOT NULL DEFAULT 'pendiente'
            CHECK (estado_registro IN ('pendiente', 'aprobado', 'rechazado')),
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_usuarios_tipo_numero UNIQUE (tipo_documento, numero_documento)
        );
        INSERT INTO usuarios_nueva (
          id_usuario, id_rol, id_aseguradora, tipo_documento, numero_documento,
          nombres, apellidos, email, telefono, password_hash, eps, ips,
          documento_eps, activo, estado_registro, fecha_registro
        )
        SELECT
          id_usuario, id_rol, id_aseguradora, tipo_documento, numero_documento,
          nombres, apellidos, email, telefono, password_hash, eps, ips,
          documento_eps, activo, estado_registro, fecha_registro
        FROM usuarios;
        DROP TABLE usuarios;
        ALTER TABLE usuarios_nueva RENAME TO usuarios;
        COMMIT;
        PRAGMA foreign_keys = ON;
      `, (errorMigracion) => {
        if (errorMigracion) {
          db.exec('ROLLBACK; PRAGMA foreign_keys = ON;', (errorRollback) => {
            if (errorRollback) errorMigracion.cause = errorRollback;
            cerrarYRechazar(errorMigracion);
          });
          return;
        }
        crearValidacionesEPSyIPS();
      });
    }
  );
};

const asegurarEPSyIPSRequeridas = migrarRestriccionEPSyIPS;

db = new sqlite3.Database(rutaBaseDatos, (error) => {
  if (error) {
    rechazarInicializacion(error);
    return;
  }

  fs.readFile(rutaEsquema, 'utf8', (errorLectura, esquema) => {
    if (errorLectura) {
      cerrarYRechazar(errorLectura);
      return;
    }

    db.exec(esquema, (errorEsquema) => {
      if (errorEsquema) return cerrarYRechazar(errorEsquema);
      asegurarColumnaIps();
    });
  });
});

module.exports = { db, ready };
