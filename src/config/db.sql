PRAGMA foreign_keys = ON;

-- =========================================================================
-- 1. TABLA DE USUARIOS (CON RESTRICCIÓN ÚNICA TIPO + NÚMERO)
-- =========================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    id_rol INTEGER NOT NULL DEFAULT 1,
    id_aseguradora INTEGER,
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'PAS', 'NIT')),
    numero_documento VARCHAR(30) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    password_hash TEXT NOT NULL CHECK (
        length(password_hash) = 161 AND
        substr(password_hash, 33, 1) = ':' AND
        substr(password_hash, 1, 32) NOT GLOB '*[^a-fA-F0-9]*' AND
        substr(password_hash, 34, 128) NOT GLOB '*[^a-fA-F0-9]*'
    ),
    eps VARCHAR(40),
    ips VARCHAR(100),
    documento_eps VARCHAR(255),
    activo BOOLEAN DEFAULT 0,
    estado_registro VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_registro IN ('pendiente', 'aprobado', 'rechazado')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_tipo_numero UNIQUE (tipo_documento, numero_documento),
    CONSTRAINT ck_usuarios_eps_o_ips CHECK (
        (eps IS NOT NULL AND length(trim(eps)) > 0) AND
        (ips IS NOT NULL AND length(trim(ips)) > 0)
    )
);

CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    creada_en INTEGER NOT NULL,
    ultima_actividad INTEGER NOT NULL,
    expira_en INTEGER NOT NULL,
    revocada_en INTEGER,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_expiracion
    ON sesiones (id_usuario, expira_en);

-- =========================================================================
-- 2. TABLA TARJETAS_NFC
-- =========================================================================

CREATE TABLE IF NOT EXISTS tarjetas_nfc (
    id_tarjeta INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    uid_nfc VARCHAR(64) NOT NULL UNIQUE,
    saldo DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA', 'BLOQUEADA', 'INACTIVA')),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nfc_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =========================================================================
-- 3. TABLA AGENDAS
-- =========================================================================

CREATE TABLE IF NOT EXISTS agendas (
    id_agenda INTEGER PRIMARY KEY AUTOINCREMENT,
    id_profesional INTEGER NOT NULL,
    id_sede INTEGER NOT NULL,
    id_especialidad INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    disponible BOOLEAN DEFAULT 1,
    CHECK (hora_fin > hora_inicio),
    CONSTRAINT fk_agenda_profesional FOREIGN KEY (id_profesional)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE
);

-- =========================================================================
-- 4. TABLA CITAS
-- =========================================================================

CREATE TABLE IF NOT EXISTS citas (
    id_cita INTEGER PRIMARY KEY AUTOINCREMENT,
    id_paciente INTEGER NOT NULL,
    id_agenda INTEGER NOT NULL UNIQUE,
    id_servicio INTEGER NOT NULL,
    estado_cita VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA'
        CHECK (estado_cita IN ('PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA')),
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_cita_agenda FOREIGN KEY (id_agenda)
        REFERENCES agendas (id_agenda) ON UPDATE CASCADE
);

-- =========================================================================
-- 5. TABLA PAGOS
-- =========================================================================

CREATE TABLE IF NOT EXISTS pagos (
    id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cita INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    id_metodo_pago INTEGER NOT NULL,
    id_tarjeta_nfc INTEGER,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto >= 0),
    referencia_transaccion VARCHAR(80) NOT NULL UNIQUE,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_pago IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pago_cita FOREIGN KEY (id_cita)
        REFERENCES citas (id_cita) ON UPDATE CASCADE,
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_pago_tarjeta_nfc FOREIGN KEY (id_tarjeta_nfc)
        REFERENCES tarjetas_nfc (id_tarjeta) ON UPDATE CASCADE
);

-- =========================================================================
-- 6. TABLA TRANSPORTE
-- =========================================================================

CREATE TABLE IF NOT EXISTS transporte (
    id_transporte INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cita INTEGER NOT NULL,
    id_pasajero INTEGER NOT NULL,
    id_conductor INTEGER,
    id_sede_destino INTEGER NOT NULL,
    id_tarjeta_nfc INTEGER,
    direccion_origen VARCHAR(150) NOT NULL,
    hora_recogida TIMESTAMP NOT NULL,
    placa_vehiculo VARCHAR(15),
    estado_viaje VARCHAR(20) NOT NULL DEFAULT 'SOLICITADO'
        CHECK (estado_viaje IN ('SOLICITADO', 'EN_RUTA', 'COMPLETADO', 'CANCELADO')),
    CONSTRAINT fk_transporte_cita FOREIGN KEY (id_cita)
        REFERENCES citas (id_cita) ON UPDATE CASCADE,
    CONSTRAINT fk_transporte_pasajero FOREIGN KEY (id_pasajero)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_transporte_conductor FOREIGN KEY (id_conductor)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_transporte_nfc FOREIGN KEY (id_tarjeta_nfc)
        REFERENCES tarjetas_nfc (id_tarjeta) ON UPDATE CASCADE
);

-- =========================================================================
-- 7. TABLA RESULTADOS
-- =========================================================================

CREATE TABLE IF NOT EXISTS resultados (
    id_resultado INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cita INTEGER NOT NULL,
    id_paciente INTEGER NOT NULL,
    id_profesional INTEGER NOT NULL,
    codigo_diagnostico VARCHAR(20) NOT NULL,
    resumen_clinico TEXT NOT NULL,
    url_archivo_adjunto VARCHAR(255),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resultado_cita FOREIGN KEY (id_cita)
        REFERENCES citas (id_cita) ON UPDATE CASCADE,
    CONSTRAINT fk_resultado_paciente FOREIGN KEY (id_paciente)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_resultado_profesional FOREIGN KEY (id_profesional)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE
);

-- =========================================================================
-- 8. TABLA NOTIFICACIONES
-- =========================================================================

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    id_cita INTEGER,
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP')),
    titulo VARCHAR(120) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT 0,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notificacion_cita FOREIGN KEY (id_cita)
        REFERENCES citas (id_cita) ON DELETE SET NULL ON UPDATE CASCADE
);