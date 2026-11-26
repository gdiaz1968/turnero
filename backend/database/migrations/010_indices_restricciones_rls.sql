BEGIN;

-- TURNERO - MIGRACION 010: INDICES, RESTRICCIONES AVANZADAS Y RLS

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE empresas
    ADD COLUMN modalidad_confirmacion_default VARCHAR(20) NOT NULL DEFAULT 'AUTOMATICA',
    ADD COLUMN horas_vencimiento_confirmacion SMALLINT NOT NULL DEFAULT 24,
    ADD COLUMN horas_vencimiento_sena SMALLINT NOT NULL DEFAULT 24,
    ADD COLUMN anticipacion_minima_minutos INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN permitir_cancelacion_cliente BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN horas_minimas_cancelacion SMALLINT NOT NULL DEFAULT 24,
    ADD COLUMN permitir_modificacion_cliente BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN horas_minimas_modificacion SMALLINT NOT NULL DEFAULT 24,
    ADD CONSTRAINT chk_empresas_modalidad_confirmacion
        CHECK (modalidad_confirmacion_default IN ('AUTOMATICA','MANUAL','CON_SENA')),
    ADD CONSTRAINT chk_empresas_horas_vencimiento
        CHECK (horas_vencimiento_confirmacion BETWEEN 1 AND 720
           AND horas_vencimiento_sena BETWEEN 1 AND 720),
    ADD CONSTRAINT chk_empresas_anticipacion
        CHECK (anticipacion_minima_minutos BETWEEN 0 AND 10080),
    ADD CONSTRAINT chk_empresas_horas_cancelacion
        CHECK (horas_minimas_cancelacion BETWEEN 0 AND 720
           AND horas_minimas_modificacion BETWEEN 0 AND 720);

CREATE UNIQUE INDEX uq_politicas_senas_ambito
    ON politicas_senas (
        id_empresa,
        COALESCE(id_servicio,'00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(id_profesional,'00000000-0000-0000-0000-000000000000'::uuid)
    );

ALTER TABLE turnos_detalle
    ADD CONSTRAINT chk_turnos_detalle_duracion_intervalo
        CHECK (fin = inicio + make_interval(mins => duracion_minutos));

ALTER TABLE turnos_detalle
    ADD CONSTRAINT ex_turnos_detalle_sin_superposicion
    EXCLUDE USING gist (
        id_empresa WITH =,
        id_profesional WITH =,
        tstzrange(inicio,fin,'[)') WITH &&
    )
    WHERE (estado NOT IN ('CANCELADO','RECHAZADO','VENCIDO'));

ALTER TABLE horarios_empresa
    ADD CONSTRAINT ex_horarios_empresa_sin_superposicion
    EXCLUDE USING gist (
        id_empresa WITH =,
        dia_semana WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio,
                DATE '2000-01-01' + hora_fin,'[)') WITH &&
    )
    WHERE (activo);

ALTER TABLE horarios_profesionales
    ADD CONSTRAINT ex_horarios_profesionales_sin_superposicion
    EXCLUDE USING gist (
        id_empresa WITH =,
        id_profesional WITH =,
        dia_semana WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio,
                DATE '2000-01-01' + hora_fin,'[)') WITH &&
    )
    WHERE (activo);

ALTER TABLE excepciones_horario_intervalos
    ADD CONSTRAINT ex_excepciones_intervalos_sin_superposicion
    EXCLUDE USING gist (
        id_empresa WITH =,
        id_excepcion WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio,
                DATE '2000-01-01' + hora_fin,'[)') WITH &&
    );

CREATE FUNCTION app_empresa_actual()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_empresa_id',true),'')::uuid
$$;

CREATE FUNCTION app_usuario_actual()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_user_id',true),'')::uuid
$$;

CREATE FUNCTION app_es_admin_plataforma()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios_roles_plataforma ur
        JOIN public.roles_plataforma rp ON rp.id = ur.id_rol
        WHERE ur.id_usuario = public.app_usuario_actual()
          AND rp.codigo = 'SUPERADMIN'
          AND rp.activo = TRUE
    )
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'empresas',
        'roles_empresa',
        'usuarios_empresas',
        'roles_permisos_empresa',
        'usuarios_empresas_roles',
        'profesionales',
        'categorias_servicios',
        'servicios',
        'profesionales_servicios',
        'clientes',
        'clientes_campos',
        'clientes_campos_valores',
        'horarios_empresa',
        'horarios_profesionales',
        'excepciones_horario',
        'excepciones_horario_intervalos',
        'bloqueos_agenda',
        'turnos',
        'turnos_detalle',
        'metodos_pago',
        'politicas_senas',
        'pagos',
        'notificaciones'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);

        IF t = 'empresas' THEN
            EXECUTE 'CREATE POLICY tenant_isolation ON public.empresas
                FOR ALL
                USING (id = public.app_empresa_actual() OR public.app_es_admin_plataforma())
                WITH CHECK (id = public.app_empresa_actual() OR public.app_es_admin_plataforma())';
        ELSIF t = 'usuarios_empresas' THEN
            EXECUTE 'CREATE POLICY tenant_membership_read ON public.usuarios_empresas
                FOR SELECT
                USING (id_empresa = public.app_empresa_actual()
                    OR id_usuario = public.app_usuario_actual()
                    OR public.app_es_admin_plataforma())';
            EXECUTE 'CREATE POLICY tenant_membership_write ON public.usuarios_empresas
                FOR ALL
                USING (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma())
                WITH CHECK (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma())';
        ELSE
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON public.%I
                    FOR ALL
                    USING (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma())
                    WITH CHECK (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma())',
                t
            );
        END IF;
    END LOOP;
END
$$;

ALTER TABLE auditoria_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_actividad FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON auditoria_actividad
    FOR ALL
    USING (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma())
    WITH CHECK (id_empresa = public.app_empresa_actual() OR public.app_es_admin_plataforma());

INSERT INTO schema_migrations (version,nombre)
VALUES (10,'010_indices_restricciones_rls.sql');

COMMENT ON FUNCTION app_empresa_actual() IS
    'Devuelve el identificador de empresa establecido por el backend en la transaccion actual.';
COMMENT ON FUNCTION app_usuario_actual() IS
    'Devuelve el identificador de usuario autenticado establecido por el backend.';
COMMENT ON FUNCTION app_es_admin_plataforma() IS
    'Comprueba si el usuario autenticado tiene el rol global SUPERADMIN.';

COMMIT;
