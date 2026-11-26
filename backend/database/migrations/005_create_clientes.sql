BEGIN;

-- TURNERO - MIGRACION 005: CLIENTES Y CAMPOS PERSONALIZADOS

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    nombre VARCHAR(120) NOT NULL,
    apellido VARCHAR(120),
    telefono VARCHAR(30) NOT NULL,
    telefono_normalizado VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    notas TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_clientes_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT chk_clientes_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_clientes_telefono CHECK (LENGTH(TRIM(telefono)) > 0),
    CONSTRAINT chk_clientes_telefono_normalizado CHECK (LENGTH(TRIM(telefono_normalizado)) > 0),
    CONSTRAINT chk_clientes_email CHECK (
        email IS NULL OR (email = BTRIM(email) AND LENGTH(BTRIM(email)) > 0)
    ),
    CONSTRAINT chk_clientes_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_clientes_empresa_telefono
    ON clientes (id_empresa,telefono_normalizado);
CREATE INDEX idx_clientes_empresa_nombre
    ON clientes (id_empresa,LOWER(nombre),LOWER(COALESCE(apellido,'')));
CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE clientes_campos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    codigo VARCHAR(60) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo_dato VARCHAR(20) NOT NULL,
    opciones JSONB NOT NULL DEFAULT '[]'::JSONB,
    visibilidad VARCHAR(30) NOT NULL DEFAULT 'ADMINISTRACION',
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_clientes_campos_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT uq_clientes_campos_empresa_id_tipo UNIQUE (id_empresa,id,tipo_dato),
    CONSTRAINT uq_clientes_campos_codigo UNIQUE (id_empresa,codigo),
    CONSTRAINT chk_clientes_campos_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_clientes_campos_tipo CHECK (
        tipo_dato IN ('TEXTO_CORTO','TEXTO_LARGO','NUMERO','FECHA','SI_NO','SELECCION')
    ),
    CONSTRAINT chk_clientes_campos_opciones CHECK (JSONB_TYPEOF(opciones) = 'array'),
    CONSTRAINT chk_clientes_campos_visibilidad CHECK (
        visibilidad IN ('ADMINISTRACION','PROFESIONALES_AUTORIZADOS','CLIENTE')
    ),
    CONSTRAINT chk_clientes_campos_orden CHECK (orden >= 0),
    CONSTRAINT chk_clientes_campos_fechas CHECK (updated_at >= created_at)
);
CREATE INDEX idx_clientes_campos_empresa_activos
    ON clientes_campos (id_empresa,activo,orden);
CREATE TRIGGER trg_clientes_campos_updated_at
BEFORE UPDATE ON clientes_campos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE clientes_campos_valores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    id_cliente UUID NOT NULL,
    id_campo UUID NOT NULL,
    tipo_dato VARCHAR(20) NOT NULL,
    valor_texto TEXT,
    valor_numero NUMERIC(14,4),
    valor_fecha DATE,
    valor_booleano BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_clientes_campos_valores UNIQUE (id_empresa,id_cliente,id_campo),
    CONSTRAINT fk_ccv_cliente FOREIGN KEY (id_empresa,id_cliente)
        REFERENCES clientes (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_ccv_campo_tipo FOREIGN KEY (id_empresa,id_campo,tipo_dato)
        REFERENCES clientes_campos (id_empresa,id,tipo_dato) ON DELETE CASCADE,
    CONSTRAINT chk_clientes_campos_valores_tipo CHECK (
        tipo_dato IN ('TEXTO_CORTO','TEXTO_LARGO','NUMERO','FECHA','SI_NO','SELECCION')
    ),
    CONSTRAINT chk_clientes_campos_valores_un_valor CHECK (
        (CASE WHEN valor_texto IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN valor_numero IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN valor_fecha IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN valor_booleano IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    CONSTRAINT chk_clientes_campos_valores_tipo_valor CHECK (
        (tipo_dato IN ('TEXTO_CORTO','TEXTO_LARGO','SELECCION') AND valor_texto IS NOT NULL)
        OR (tipo_dato = 'NUMERO' AND valor_numero IS NOT NULL)
        OR (tipo_dato = 'FECHA' AND valor_fecha IS NOT NULL)
        OR (tipo_dato = 'SI_NO' AND valor_booleano IS NOT NULL)
    )
);
CREATE INDEX idx_clientes_campos_valores_cliente
    ON clientes_campos_valores (id_empresa,id_cliente);
CREATE TRIGGER trg_clientes_campos_valores_updated_at
BEFORE UPDATE ON clientes_campos_valores FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (5,'005_create_clientes.sql');

COMMENT ON TABLE clientes IS 'Cartera de clientes independiente para cada empresa.';
COMMENT ON COLUMN clientes.telefono_normalizado IS
    'Telefono normalizado por el backend para busqueda; no es unico porque puede ser compartido.';
COMMENT ON TABLE clientes_campos IS
    'Definicion de campos personalizados de la ficha de clientes por empresa.';
COMMENT ON TABLE clientes_campos_valores IS
    'Valores tipados de los campos personalizados de cada cliente.';

COMMIT;
