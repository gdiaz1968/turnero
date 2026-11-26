-- TURNERO - Estados de gestion de turnos
-- Los turnos registrados pasan a estado pendiente para revision del profesional.

BEGIN;

ALTER TABLE turnos
  ALTER COLUMN estado SET DEFAULT 'PENDIENTE';

UPDATE turnos
SET estado = 'PENDIENTE'
WHERE estado = 'REGISTRADO';

COMMIT;
