BEGIN;

-- TURNERO - MIGRACION 009: AUDITORIA Y NOTIFICACIONES

CREATE TABLE auditoria_actividad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID REFERENCES empresas(id) ON DELETE SET NULL,
    id_usuario UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100),
    id_entidad UUID,
    resultado VARCHAR(15) NOT NULL,
    descripcion TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_auditoria_accion CHECK (LENGTH(TRIM(accion)) > 0),
    CONSTRAINT chk_auditoria_resultado CHECK (resultado IN ('OK','ERROR','ADVERTENCIA')),
    CONSTRAINT chk_auditoria_metadata CHECK (JSONB_TYPEOF(metadata) = 'object')
);
CREATE INDEX idx_auditoria_empresa_fecha
    ON auditoria_actividad (id_empresa,created_at DESC);
CREATE INDEX idx_auditoria_usuario_fecha
    ON auditoria_actividad (id_usuario,created_at DESC);
CREATE INDEX idx_auditoria_entidad
    ON auditoria_actividad (id_empresa,entidad,id_entidad,created_at DESC);
CREATE INDEX idx_auditoria_resultado_fecha
    ON auditoria_actividad (resultado,created_at DESC);

CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_usuario UUID,
    id_cliente UUID,
    id_turno UUID,
    canal VARCHAR(20) NOT NULL,
    tipo VARCHAR(60) NOT NULL,
    destino VARCHAR(200) NOT NULL,
    asunto VARCHAR(200),
    contenido TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    programada_para TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    procesada_en TIMESTAMPTZ,
    intentos INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    clave_idempotencia VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notificaciones_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (id_empresa,id_usuario)
        REFERENCES usuarios_empresas (id_empresa,id_usuario)
        ON DELETE SET NULL (id_usuario),
    CONSTRAINT fk_notificaciones_cliente FOREIGN KEY (id_empresa,id_cliente)
        REFERENCES clientes (id_empresa,id) ON DELETE SET NULL (id_cliente),
    CONSTRAINT fk_notificaciones_turno FOREIGN KEY (id_empresa,id_turno)
        REFERENCES turnos (id_empresa,id) ON DELETE SET NULL (id_turno),
    CONSTRAINT chk_notificaciones_canal CHECK (canal IN ('EMAIL','WHATSAPP','PUSH','INTERNO')),
    CONSTRAINT chk_notificaciones_estado CHECK (
        estado IN ('PENDIENTE','PROCESANDO','ENVIADA','FALLIDA','CANCELADA')
    ),
    CONSTRAINT chk_notificaciones_payload CHECK (JSONB_TYPEOF(payload) = 'object'),
    CONSTRAINT chk_notificaciones_intentos CHECK (intentos >= 0)
);
CREATE UNIQUE INDEX uq_notificaciones_idempotencia
    ON notificaciones (id_empresa,clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;
CREATE INDEX idx_notificaciones_pendientes
    ON notificaciones (estado,programada_para)
    WHERE estado IN ('PENDIENTE','FALLIDA');
CREATE INDEX idx_notificaciones_empresa_fecha
    ON notificaciones (id_empresa,created_at DESC);
CREATE TRIGGER trg_notificaciones_updated_at
BEFORE UPDATE ON notificaciones FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (9,'009_create_auditoria_notificaciones.sql');

COMMENT ON TABLE auditoria_actividad IS
    'Registro de operaciones exitosas, errores y advertencias de plataforma y empresas.';
COMMENT ON COLUMN auditoria_actividad.resultado IS
    'OK para exito, ERROR para intento fallido y ADVERTENCIA para eventos relevantes.';
COMMENT ON TABLE notificaciones IS
    'Cola persistente de notificaciones y su estado de entrega.';

COMMIT;
