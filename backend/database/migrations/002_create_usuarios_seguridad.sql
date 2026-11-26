BEGIN;

-- TURNERO - MIGRACION 002: USUARIOS Y SEGURIDAD

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(60) NOT NULL,
    email VARCHAR(150),
    password_hash TEXT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuarios_username CHECK (LENGTH(TRIM(username)) BETWEEN 3 AND 60),
    CONSTRAINT chk_usuarios_nombre CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_usuarios_password_hash CHECK (LENGTH(password_hash) > 0),
    CONSTRAINT chk_usuarios_username_espacios CHECK (username = BTRIM(username)),
    CONSTRAINT chk_usuarios_email_espacios CHECK (
        email IS NULL OR (email = BTRIM(email) AND LENGTH(BTRIM(email)) > 0)
    )
);

CREATE UNIQUE INDEX uq_usuarios_username ON usuarios (LOWER(username));
CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_usuarios_activos ON usuarios (activo);
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    alcance VARCHAR(20) NOT NULL,
    categoria VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_permisos_alcance CHECK (alcance IN ('EMPRESA','PLATAFORMA')),
    CONSTRAINT uq_permisos_alcance_codigo UNIQUE (alcance,codigo),
    CONSTRAINT uq_permisos_id_alcance UNIQUE (id,alcance)
);

CREATE TABLE roles_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    codigo VARCHAR(60) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_roles_empresa_codigo UNIQUE (id_empresa,codigo),
    CONSTRAINT uq_roles_empresa_id UNIQUE (id_empresa,id),
    CONSTRAINT chk_roles_empresa_nombre CHECK (LENGTH(TRIM(nombre)) > 0)
);
CREATE INDEX idx_roles_empresa_activos ON roles_empresa (id_empresa,activo);
CREATE TRIGGER trg_roles_empresa_updated_at
BEFORE UPDATE ON roles_empresa FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE usuarios_empresas (
    id_empresa UUID NOT NULL REFERENCES empresas(id),
    id_usuario UUID NOT NULL REFERENCES usuarios(id),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_baja TIMESTAMPTZ,
    PRIMARY KEY (id_empresa,id_usuario),
    CONSTRAINT chk_usuarios_empresas_fechas
        CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta)
);
CREATE INDEX idx_usuarios_empresas_usuario ON usuarios_empresas (id_usuario);
CREATE INDEX idx_usuarios_empresas_activos ON usuarios_empresas (id_empresa,activo);

CREATE TABLE roles_permisos_empresa (
    id_empresa UUID NOT NULL,
    id_rol UUID NOT NULL,
    id_permiso UUID NOT NULL,
    alcance VARCHAR(20) NOT NULL DEFAULT 'EMPRESA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_empresa,id_rol,id_permiso),
    CONSTRAINT chk_roles_permisos_empresa_alcance CHECK (alcance = 'EMPRESA'),
    CONSTRAINT fk_rpe_rol FOREIGN KEY (id_empresa,id_rol)
        REFERENCES roles_empresa (id_empresa,id) ON DELETE CASCADE,
    CONSTRAINT fk_rpe_permiso FOREIGN KEY (id_permiso,alcance)
        REFERENCES permisos (id,alcance)
);

CREATE TABLE usuarios_empresas_roles (
    id_empresa UUID NOT NULL,
    id_usuario UUID NOT NULL,
    id_rol UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_empresa,id_usuario,id_rol),
    CONSTRAINT fk_uer_membresia FOREIGN KEY (id_empresa,id_usuario)
        REFERENCES usuarios_empresas (id_empresa,id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_uer_rol FOREIGN KEY (id_empresa,id_rol)
        REFERENCES roles_empresa (id_empresa,id) ON DELETE CASCADE
);
CREATE INDEX idx_usuarios_empresas_roles_usuario
    ON usuarios_empresas_roles (id_empresa,id_usuario);
CREATE INDEX idx_usuarios_empresas_roles_rol
    ON usuarios_empresas_roles (id_empresa,id_rol);

CREATE TABLE roles_plataforma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_roles_plataforma_updated_at
BEFORE UPDATE ON roles_plataforma FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TABLE roles_permisos_plataforma (
    id_rol UUID NOT NULL REFERENCES roles_plataforma(id) ON DELETE CASCADE,
    id_permiso UUID NOT NULL,
    alcance VARCHAR(20) NOT NULL DEFAULT 'PLATAFORMA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_rol,id_permiso),
    CONSTRAINT chk_roles_permisos_plataforma_alcance CHECK (alcance = 'PLATAFORMA'),
    CONSTRAINT fk_rpp_permiso FOREIGN KEY (id_permiso,alcance)
        REFERENCES permisos (id,alcance)
);

CREATE TABLE usuarios_roles_plataforma (
    id_usuario UUID NOT NULL REFERENCES usuarios(id),
    id_rol UUID NOT NULL REFERENCES roles_plataforma(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_usuario,id_rol)
);
CREATE INDEX idx_usuarios_roles_plataforma_rol ON usuarios_roles_plataforma (id_rol);

INSERT INTO permisos (codigo,nombre,alcance,categoria) VALUES
 ('EMPRESA_GESTIONAR','Gestionar empresa','EMPRESA','EMPRESA'),
 ('USUARIOS_GESTIONAR','Gestionar usuarios','EMPRESA','SEGURIDAD'),
 ('ROLES_GESTIONAR','Gestionar roles y permisos','EMPRESA','SEGURIDAD'),
 ('PROFESIONALES_GESTIONAR','Gestionar profesionales','EMPRESA','PROFESIONALES'),
 ('SERVICIOS_GESTIONAR','Gestionar servicios','EMPRESA','SERVICIOS'),
 ('TURNOS_VER_TODOS','Ver todos los turnos','EMPRESA','TURNOS'),
 ('TURNOS_GESTIONAR_TODOS','Gestionar todos los turnos','EMPRESA','TURNOS'),
 ('TURNOS_VER_PROPIOS','Ver turnos propios','EMPRESA','TURNOS'),
 ('TURNOS_GESTIONAR_PROPIOS','Gestionar turnos propios','EMPRESA','TURNOS'),
 ('CLIENTES_GESTIONAR','Gestionar clientes','EMPRESA','CLIENTES'),
 ('PAGOS_GESTIONAR','Gestionar pagos y señas','EMPRESA','PAGOS'),
 ('REPORTES_VER','Consultar reportes','EMPRESA','REPORTES'),
 ('CONFIGURACION_GESTIONAR','Gestionar configuracion','EMPRESA','CONFIGURACION');

INSERT INTO permisos (codigo,nombre,alcance,categoria) VALUES
 ('PLATAFORMA_EMPRESAS_VER','Consultar empresas','PLATAFORMA','PLATAFORMA'),
 ('PLATAFORMA_EMPRESAS_GESTIONAR','Gestionar empresas','PLATAFORMA','PLATAFORMA'),
 ('PLATAFORMA_USUARIOS_VER','Consultar usuarios globales','PLATAFORMA','PLATAFORMA'),
 ('PLATAFORMA_USUARIOS_GESTIONAR','Gestionar usuarios globales','PLATAFORMA','PLATAFORMA'),
 ('PLATAFORMA_ROLES_GESTIONAR','Gestionar roles de plataforma','PLATAFORMA','PLATAFORMA');

INSERT INTO roles_plataforma (codigo,nombre,descripcion)
VALUES ('SUPERADMIN','Administrador global','Administrador general de la plataforma TURNERO.');

INSERT INTO roles_permisos_plataforma (id_rol,id_permiso)
SELECT rp.id,p.id
FROM roles_plataforma rp CROSS JOIN permisos p
WHERE rp.codigo = 'SUPERADMIN' AND p.alcance = 'PLATAFORMA';

INSERT INTO schema_migrations (version,nombre)
VALUES (2,'002_create_usuarios_seguridad.sql');

COMMENT ON TABLE usuarios IS 'Identidades globales de acceso a TURNERO.';
COMMENT ON COLUMN usuarios.username IS 'Identificador de acceso por nombre de usuario.';
COMMENT ON COLUMN usuarios.email IS 'Correo opcional utilizado como identificador alternativo de acceso.';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash seguro de contraseña. Nunca almacenar contraseñas en texto plano.';
COMMENT ON TABLE usuarios_empresas IS 'Relaciones de pertenencia entre usuarios y empresas.';
COMMENT ON TABLE usuarios_empresas_roles IS 'Permite asignar multiples roles a un usuario dentro de una empresa.';
COMMENT ON TABLE roles_plataforma IS 'Roles globales independientes de los roles de cada empresa.';

COMMIT;
