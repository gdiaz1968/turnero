BEGIN;

-- TURNERO - MIGRACION 003: PROFESIONALES

CREATE TABLE profesionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_usuario UUID,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    telefono VARCHAR(30),
    email VARCHAR(150),
    descripcion TEXT,
    timezone VARCHAR(64),
    color_agenda VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    acepta_reservas_online BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_profesionales_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_profesionales_usuario_empresa
        FOREIGN KEY (id_empresa,id_usuario)
        REFERENCES usuarios_empresas (id_empresa,id_usuario) ON DELETE RESTRICT,
    CONSTRAINT chk_profesionales_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_profesionales_apellido CHECK (apellido IS NULL OR apellido = BTRIM(apellido)),
    CONSTRAINT chk_profesionales_telefono CHECK (telefono IS NULL OR telefono = BTRIM(telefono)),
    CONSTRAINT chk_profesionales_email CHECK (
        email IS NULL OR (email = BTRIM(email) AND LENGTH(BTRIM(email)) > 0)
    ),
    CONSTRAINT chk_profesionales_timezone CHECK (timezone IS NULL OR LENGTH(TRIM(timezone)) > 0),
    CONSTRAINT chk_profesionales_color CHECK (color_agenda ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_profesionales_orden CHECK (orden >= 0),
    CONSTRAINT chk_profesionales_fechas CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX uq_profesionales_usuario_empresa
    ON profesionales (id_empresa,id_usuario) WHERE id_usuario IS NOT NULL;
CREATE INDEX idx_profesionales_empresa_activos
    ON profesionales (id_empresa,activo,orden);
CREATE INDEX idx_profesionales_usuario
    ON profesionales (id_usuario) WHERE id_usuario IS NOT NULL;

CREATE TRIGGER trg_profesionales_updated_at
BEFORE UPDATE ON profesionales FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (3,'003_create_profesionales.sql');

COMMENT ON TABLE profesionales IS
    'Profesionales que prestan servicios dentro de cada empresa.';
COMMENT ON COLUMN profesionales.id_usuario IS
    'Cuenta de acceso opcional. Debe pertenecer a la misma empresa.';
COMMENT ON COLUMN profesionales.timezone IS
    'Zona horaria IANA propia del profesional. Si es NULL, se utiliza la zona horaria de la empresa.';
COMMENT ON COLUMN profesionales.color_agenda IS
    'Color hexadecimal utilizado para identificar al profesional en la agenda.';
COMMENT ON COLUMN profesionales.acepta_reservas_online IS
    'Indica si el profesional puede recibir reservas realizadas por internet.';

COMMIT;
