BEGIN;

-- TURNERO - MIGRACION 007: TURNOS Y DETALLES

CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_cliente UUID NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
    modalidad_confirmacion VARCHAR(20) NOT NULL,
    origen VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    notas_cliente TEXT,
    notas_internas TEXT,
    fecha_confirmacion TIMESTAMPTZ,
    fecha_cancelacion TIMESTAMPTZ,
    motivo_cancelacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_turnos_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT uq_turnos_codigo UNIQUE (id_empresa,codigo),
    CONSTRAINT fk_turnos_cliente FOREIGN KEY (id_empresa,id_cliente)
        REFERENCES clientes (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT chk_turnos_estado CHECK (
        estado IN ('PENDIENTE_CONFIRMACION','PENDIENTE_SENA','CONFIRMADO',
                   'EN_CURSO','FINALIZADO','CANCELADO','RECHAZADO','AUSENTE','VENCIDO')
    ),
    CONSTRAINT chk_turnos_modalidad CHECK (
        modalidad_confirmacion IN ('AUTOMATICA','MANUAL','CON_SENA')
    ),
    CONSTRAINT chk_turnos_origen CHECK (origen IN ('ONLINE','ADMINISTRACION','PROFESIONAL')),
    CONSTRAINT chk_turnos_intervalo CHECK (fin > inicio),
    CONSTRAINT chk_turnos_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_turnos_empresa_inicio ON turnos (id_empresa,inicio);
CREATE INDEX idx_turnos_empresa_estado_inicio ON turnos (id_empresa,estado,inicio);
CREATE INDEX idx_turnos_cliente ON turnos (id_empresa,id_cliente,inicio DESC);
CREATE TRIGGER trg_turnos_updated_at
BEFORE UPDATE ON turnos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE turnos_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    id_turno UUID NOT NULL,
    id_profesional UUID NOT NULL,
    id_servicio UUID NOT NULL,
    nombre_servicio VARCHAR(150) NOT NULL,
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    precio NUMERIC(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_turnos_detalle_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_turnos_detalle_turno FOREIGN KEY (id_empresa,id_turno)
        REFERENCES turnos (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_turnos_detalle_profesional FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT fk_turnos_detalle_servicio FOREIGN KEY (id_empresa,id_servicio)
        REFERENCES servicios (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT fk_turnos_detalle_profesional_servicio
        FOREIGN KEY (id_empresa,id_profesional,id_servicio)
        REFERENCES profesionales_servicios (id_empresa,id_profesional,id_servicio)
        ON DELETE RESTRICT,
    CONSTRAINT chk_turnos_detalle_nombre CHECK (LENGTH(TRIM(nombre_servicio)) > 0),
    CONSTRAINT chk_turnos_detalle_intervalo CHECK (fin > inicio),
    CONSTRAINT chk_turnos_detalle_duracion CHECK (duracion_minutos BETWEEN 1 AND 1440),
    CONSTRAINT chk_turnos_detalle_duracion_intervalo
        CHECK (fin = inicio + make_interval(mins => duracion_minutos)),
    CONSTRAINT chk_turnos_detalle_precio CHECK (precio >= 0),
    CONSTRAINT chk_turnos_detalle_estado CHECK (
        estado IN ('PENDIENTE','CONFIRMADO','EN_CURSO','FINALIZADO',
                   'CANCELADO','RECHAZADO','AUSENTE','VENCIDO')
    ),
    CONSTRAINT chk_turnos_detalle_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_turnos_detalle_turno ON turnos_detalle (id_empresa,id_turno);
CREATE INDEX idx_turnos_detalle_profesional_inicio
    ON turnos_detalle (id_empresa,id_profesional,inicio,fin);
CREATE INDEX idx_turnos_detalle_servicio ON turnos_detalle (id_empresa,id_servicio);
CREATE TRIGGER trg_turnos_detalle_updated_at
BEFORE UPDATE ON turnos_detalle FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (7,'007_create_turnos.sql');

COMMENT ON TABLE turnos IS
    'Reserva principal que puede agrupar uno o varios servicios.';
COMMENT ON TABLE turnos_detalle IS
    'Servicios reservados con profesional, precio, duracion y horario historicos.';
COMMENT ON COLUMN turnos_detalle.inicio IS
    'Inicio efectivo del servicio; permite servicios simultaneos con profesionales diferentes.';
COMMENT ON COLUMN turnos_detalle.precio IS
    'Precio congelado al momento de reservar.';
COMMENT ON COLUMN turnos_detalle.duracion_minutos IS
    'Duracion efectiva congelada al momento de reservar.';

COMMIT;
