BEGIN;

-- TURNERO - MIGRACION 008: SEÑAS, PAGOS Y METODOS DE PAGO

CREATE TABLE metodos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'OTRO',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    requiere_referencia BOOLEAN NOT NULL DEFAULT FALSE,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_metodos_pago_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT uq_metodos_pago_codigo UNIQUE (id_empresa,codigo),
    CONSTRAINT chk_metodos_pago_tipo CHECK (
        tipo IN ('EFECTIVO','TRANSFERENCIA','TARJETA','BILLETERA','ONLINE','OTRO')
    ),
    CONSTRAINT chk_metodos_pago_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_metodos_pago_orden CHECK (orden >= 0)
);
CREATE INDEX idx_metodos_pago_empresa_activos
    ON metodos_pago (id_empresa,activo,orden);
CREATE TRIGGER trg_metodos_pago_updated_at
BEFORE UPDATE ON metodos_pago FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE politicas_senas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_servicio UUID,
    id_profesional UUID,
    activa BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_monto VARCHAR(15) NOT NULL DEFAULT 'PORCENTAJE',
    monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
    modalidad_confirmacion VARCHAR(20) NOT NULL DEFAULT 'CON_SENA',
    horas_vencimiento INTEGER NOT NULL DEFAULT 24,
    horas_minimas_cancelacion INTEGER NOT NULL DEFAULT 24,
    condiciones_devolucion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_politicas_senas_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_politicas_senas_servicio FOREIGN KEY (id_empresa,id_servicio)
        REFERENCES servicios (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_politicas_senas_profesional FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT chk_politicas_senas_tipo CHECK (tipo_monto IN ('FIJO','PORCENTAJE')),
    CONSTRAINT chk_politicas_senas_monto CHECK (monto >= 0 AND minimo >= 0),
    CONSTRAINT chk_politicas_senas_porcentaje CHECK (tipo_monto <> 'PORCENTAJE' OR monto <= 100),
    CONSTRAINT chk_politicas_senas_modalidad CHECK (
        modalidad_confirmacion IN ('AUTOMATICA','MANUAL','CON_SENA')
    ),
    CONSTRAINT chk_politicas_senas_vencimiento CHECK (horas_vencimiento BETWEEN 1 AND 720),
    CONSTRAINT chk_politicas_senas_cancelacion CHECK (horas_minimas_cancelacion BETWEEN 0 AND 720)
);
CREATE INDEX idx_politicas_senas_busqueda
    ON politicas_senas (id_empresa,id_servicio,id_profesional,activa);
CREATE TRIGGER trg_politicas_senas_updated_at
BEFORE UPDATE ON politicas_senas FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_turno UUID NOT NULL,
    id_metodo_pago UUID,
    id_pago_origen UUID,
    tipo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    importe_esperado NUMERIC(12,2) NOT NULL DEFAULT 0,
    importe_recibido NUMERIC(12,2) NOT NULL DEFAULT 0,
    moneda CHAR(3) NOT NULL DEFAULT 'ARS',
    fecha_pago TIMESTAMPTZ,
    fecha_confirmacion TIMESTAMPTZ,
    id_usuario_confirmacion UUID,
    referencia VARCHAR(150),
    comprobante_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pagos_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_pagos_turno FOREIGN KEY (id_empresa,id_turno)
        REFERENCES turnos (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_metodo FOREIGN KEY (id_empresa,id_metodo_pago)
        REFERENCES metodos_pago (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_origen FOREIGN KEY (id_empresa,id_pago_origen)
        REFERENCES pagos (id_empresa,id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_usuario_confirmacion FOREIGN KEY (id_empresa,id_usuario_confirmacion)
        REFERENCES usuarios_empresas (id_empresa,id_usuario)
        ON DELETE SET NULL (id_usuario_confirmacion),
    CONSTRAINT chk_pagos_tipo CHECK (tipo IN ('SENA','PAGO','DEVOLUCION','AJUSTE')),
    CONSTRAINT chk_pagos_estado CHECK (estado IN ('PENDIENTE','CONFIRMADO','RECHAZADO','ANULADO')),
    CONSTRAINT chk_pagos_importes CHECK (importe_esperado >= 0 AND importe_recibido >= 0),
    CONSTRAINT chk_pagos_moneda CHECK (moneda ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_pagos_devolucion_origen CHECK (
        (tipo = 'DEVOLUCION' AND id_pago_origen IS NOT NULL)
        OR (tipo <> 'DEVOLUCION' AND id_pago_origen IS NULL)
    )
);
CREATE INDEX idx_pagos_turno ON pagos (id_empresa,id_turno,created_at);
CREATE INDEX idx_pagos_estado ON pagos (id_empresa,estado,created_at);
CREATE INDEX idx_pagos_metodo ON pagos (id_empresa,id_metodo_pago);
CREATE TRIGGER trg_pagos_updated_at
BEFORE UPDATE ON pagos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

INSERT INTO schema_migrations (version,nombre)
VALUES (8,'008_create_pagos_senas.sql');

COMMENT ON TABLE politicas_senas IS
    'Politicas de anticipos configurables a nivel empresa, servicio o profesional.';
COMMENT ON TABLE pagos IS
    'Movimientos de pagos, señas, ajustes y devoluciones; el comprobante no implica confirmacion.';
COMMENT ON COLUMN pagos.importe_recibido IS
    'Importe confirmado como efectivamente recibido; el backend no debe asumir pago por adjuntar comprobante.';

COMMIT;
