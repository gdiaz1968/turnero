BEGIN;

-- TURNERO - MIGRACION 001: EMPRESAS

CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    razon_social VARCHAR(200),
    identificacion_fiscal VARCHAR(30),
    slug VARCHAR(80) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    whatsapp VARCHAR(30),
    direccion VARCHAR(200),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(20),
    pais CHAR(2) NOT NULL DEFAULT 'AR',
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    reservas_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
    configuracion JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_empresas_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_empresas_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_empresas_pais CHECK (pais ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_empresas_configuracion CHECK (JSONB_TYPEOF(configuracion) = 'object'),
    CONSTRAINT chk_empresas_fechas CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX uq_empresas_slug ON empresas (slug);
CREATE INDEX idx_empresas_activas ON empresas (activa);
CREATE INDEX idx_empresas_identificacion_fiscal
    ON empresas (identificacion_fiscal)
    WHERE identificacion_fiscal IS NOT NULL;

CREATE FUNCTION actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_schema_migrations_version CHECK (version > 0)
);

INSERT INTO schema_migrations (version, nombre)
VALUES (1, '001_create_empresas.sql');

COMMENT ON TABLE empresas IS
    'Establecimientos registrados en la plataforma TURNERO.';
COMMENT ON COLUMN empresas.slug IS
    'Identificador publico y unico utilizado en las URLs.';
COMMENT ON COLUMN empresas.timezone IS
    'Zona horaria IANA del establecimiento.';

COMMIT;
