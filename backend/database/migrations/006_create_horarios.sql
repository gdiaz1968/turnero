BEGIN;

-- TURNERO - MIGRACION 006: HORARIOS, EXCEPCIONES Y BLOQUEOS

CREATE TABLE horarios_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    dia_semana SMALLINT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_horarios_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT chk_horarios_empresa_dia CHECK (dia_semana BETWEEN 0 AND 6),
    CONSTRAINT chk_horarios_empresa_intervalo CHECK (hora_fin > hora_inicio)
);
CREATE INDEX idx_horarios_empresa_dia
    ON horarios_empresa (id_empresa,dia_semana,activo);
CREATE TRIGGER trg_horarios_empresa_updated_at
BEFORE UPDATE ON horarios_empresa FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE horarios_profesionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    id_profesional UUID NOT NULL,
    dia_semana SMALLINT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_horarios_profesionales_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_horarios_profesionales_profesional
        FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT chk_horarios_profesionales_dia CHECK (dia_semana BETWEEN 0 AND 6),
    CONSTRAINT chk_horarios_profesionales_intervalo CHECK (hora_fin > hora_inicio)
);
CREATE INDEX idx_horarios_profesionales_dia
    ON horarios_profesionales (id_empresa,id_profesional,dia_semana,activo);
CREATE TRIGGER trg_horarios_profesionales_updated_at
BEFORE UPDATE ON horarios_profesionales FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE excepciones_horario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_profesional UUID,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    descripcion VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_excepciones_horario_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_excepciones_horario_profesional
        FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT chk_excepciones_horario_tipo CHECK (
        tipo IN ('CERRADO','HORARIO_ESPECIAL','VACACIONES','LICENCIA','FERIADO','OTRO')
    )
);
CREATE INDEX idx_excepciones_horario_fecha
    ON excepciones_horario (id_empresa,fecha,id_profesional);
CREATE TRIGGER trg_excepciones_horario_updated_at
BEFORE UPDATE ON excepciones_horario FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE excepciones_horario_intervalos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL,
    id_excepcion UUID NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ehi_excepcion FOREIGN KEY (id_empresa,id_excepcion)
        REFERENCES excepciones_horario (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT chk_ehi_intervalo CHECK (hora_fin > hora_inicio)
);
CREATE INDEX idx_ehi_excepcion
    ON excepciones_horario_intervalos (id_empresa,id_excepcion);

CREATE TABLE bloqueos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_profesional UUID,
    id_usuario_creador UUID,
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bloqueos_agenda_id UNIQUE (id_empresa,id),
    CONSTRAINT fk_bloqueos_agenda_profesional
        FOREIGN KEY (id_empresa,id_profesional)
        REFERENCES profesionales (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_bloqueos_agenda_usuario
        FOREIGN KEY (id_empresa,id_usuario_creador)
        REFERENCES usuarios_empresas (id_empresa,id_usuario)
        ON DELETE SET NULL (id_usuario_creador),
    CONSTRAINT chk_bloqueos_agenda_intervalo CHECK (fin > inicio)
);
CREATE INDEX idx_bloqueos_agenda_periodo
    ON bloqueos_agenda (id_empresa,inicio,fin);
CREATE INDEX idx_bloqueos_agenda_profesional
    ON bloqueos_agenda (id_empresa,id_profesional,inicio,fin);

INSERT INTO schema_migrations (version,nombre)
VALUES (6,'006_create_horarios.sql');

COMMENT ON TABLE horarios_empresa IS
    'Intervalos semanales de apertura del establecimiento; admite varios intervalos por dia.';
COMMENT ON TABLE horarios_profesionales IS
    'Disponibilidad semanal individual; debe quedar dentro del horario del establecimiento.';
COMMENT ON TABLE excepciones_horario IS
    'Excepciones de calendario para empresa o profesional.';
COMMENT ON TABLE bloqueos_agenda IS
    'Bloqueos manuales por profesional o generales de la empresa.';

COMMIT;
