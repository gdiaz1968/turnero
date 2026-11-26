BEGIN;

-- TURNERO - MIGRACION 004: SERVICIOS Y CATEGORIAS

CREATE TABLE categorias_servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#64748B',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categorias_servicios_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT uq_categorias_servicios_nombre UNIQUE (id_empresa,nombre),
    CONSTRAINT chk_categorias_servicios_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_categorias_servicios_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_categorias_servicios_orden CHECK (orden >= 0),
    CONSTRAINT chk_categorias_servicios_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_categorias_servicios_empresa_activo
    ON categorias_servicios (id_empresa,activo,orden);
CREATE TRIGGER trg_categorias_servicios_updated_at
BEFORE UPDATE ON categorias_servicios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_categoria UUID,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    duracion_minutos INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    modalidad_confirmacion VARCHAR(30),
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_servicios_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_servicios_categoria FOREIGN KEY (id_empresa,id_categoria)
        REFERENCES categorias_servicios (id_empresa,id) ON DELETE SET NULL (id_categoria),
    CONSTRAINT chk_servicios_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_servicios_duracion CHECK (duracion_minutos BETWEEN 5 AND 1440),
    CONSTRAINT chk_servicios_modalidad CHECK (
        modalidad_confirmacion IS NULL
        OR modalidad_confirmacion IN ('AUTOMATICA','MANUAL','CON_SENA')
    ),
    CONSTRAINT chk_servicios_orden CHECK (orden >= 0),
    CONSTRAINT chk_servicios_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_servicios_empresa_activos ON servicios (id_empresa,activo,orden);
CREATE INDEX idx_servicios_categoria ON servicios (id_empresa,id_categoria);
CREATE TRIGGER trg_servicios_updated_at
BEFORE UPDATE ON servicios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE profesionales_servicios (
    id_empresa UUID NOT NULL,
    id_profesional UUID NOT NULL,
    id_servicio UUID NOT NULL,
    precio NUMERIC(12,2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_empresa,id_profesional,id_servicio),
    CONSTRAINT fk_ps_profesional FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_servicio FOREIGN KEY (id_empresa,id_servicio)
        REFERENCES servicios (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT chk_profesionales_servicios_precio CHECK (precio >= 0),
    CONSTRAINT chk_profesionales_servicios_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_profesionales_servicios_servicio
    ON profesionales_servicios (id_empresa,id_servicio,activo);
CREATE TRIGGER trg_profesionales_servicios_updated_at
BEFORE UPDATE ON profesionales_servicios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (4,'004_create_servicios.sql');

COMMENT ON TABLE categorias_servicios IS 'Categorias configurables de servicios por empresa.';
COMMENT ON TABLE servicios IS 'Catalogo de servicios de cada empresa.';
COMMENT ON COLUMN servicios.duracion_minutos IS 'Duracion predeterminada del servicio en minutos.';
COMMENT ON COLUMN servicios.modalidad_confirmacion IS 'Si es NULL, se hereda la modalidad configurada por la empresa.';
COMMENT ON TABLE profesionales_servicios IS
    'Servicios que puede realizar cada profesional y su precio particular.';

COMMIT;
