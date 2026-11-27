-- TURNERO - Consulta publica segura del estado de un turno
-- El token original nunca se almacena; solo se conserva su hash SHA-256.

BEGIN;

ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS consulta_token_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_consulta_token_hash
  ON public.turnos (consulta_token_hash)
  WHERE consulta_token_hash IS NOT NULL;

COMMIT;
