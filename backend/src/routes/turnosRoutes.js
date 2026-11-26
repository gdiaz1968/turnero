const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

function validarFecha(fecha) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) return false;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fechaUtc.getUTCFullYear() === anio &&
    fechaUtc.getUTCMonth() === mes - 1 &&
    fechaUtc.getUTCDate() === dia
  );
}

function validarHora(hora) {
  const coincidencia = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(hora);
  if (!coincidencia) return false;

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  const segundos = coincidencia[3] === undefined ? 0 : Number(coincidencia[3]);

  return horas <= 23 && minutos <= 59 && segundos <= 59;
}

// Listar turnos. Si se envía ?fecha=AAAA-MM-DD, filtra por ese día.
router.get("/", async (req, res) => {
  try {
    const { fecha } = req.query;
    const parametros = [];
    let filtro = "";

    if (fecha) {
      parametros.push(fecha);
      filtro = "WHERE t.fecha = $1";
    }

    const resultado = await pool.query(
      `
        SELECT
          t.id,
          c.nombre AS cliente,
          c.telefono,
          t.servicio,
          TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
          TO_CHAR(t.hora, 'HH24:MI') AS hora,
          t.estado,
          t.observaciones,
          t.creado_en
        FROM turnos t
        INNER JOIN clientes c ON c.id = t.cliente_id
        ${filtro}
        ORDER BY t.fecha ASC, t.hora ASC, t.id ASC
      `,
      parametros
    );

    res.json({ success: true, turnos: resultado.rows });
  } catch (error) {
    console.error("Error consultando turnos:", error);
    res.status(500).json({
      success: false,
      message: "No se pudieron consultar los turnos."
    });
  }
});

// Registrar cliente y turno en una única operación.
router.post("/", async (req, res) => {
  const cuerpo = req.body || {};
  const nombre = String(cuerpo.nombre || "").trim();
  const telefono = String(cuerpo.telefono || "").trim();
  const servicio = String(cuerpo.servicio || "").trim();
  const fecha = String(cuerpo.fecha || "").trim();
  const hora = String(cuerpo.hora || "").trim();
  const observaciones = String(cuerpo.observaciones || "").trim();

  if (!nombre || !telefono || !servicio || !fecha || !hora) {
    return res.status(400).json({
      success: false,
      message: "Completá nombre, teléfono, servicio, fecha y hora."
    });
  }

  if (nombre.length > 120) {
    return res.status(400).json({ success: false, message: "El nombre no puede superar los 120 caracteres." });
  }

  if (telefono.length > 40) {
    return res.status(400).json({ success: false, message: "El teléfono no puede superar los 40 caracteres." });
  }

  if (servicio.length > 120) {
    return res.status(400).json({ success: false, message: "El servicio no puede superar los 120 caracteres." });
  }

  if (observaciones.length > 1000) {
    return res.status(400).json({ success: false, message: "Las observaciones no pueden superar los 1000 caracteres." });
  }

  if (!validarFecha(fecha)) {
    return res.status(400).json({ success: false, message: "La fecha no es válida. Seleccioná una fecha del calendario." });
  }

  if (!validarHora(hora)) {
    return res.status(400).json({ success: false, message: "La hora no es válida. Seleccioná una hora válida." });
  }

  let conexion;

  try {
    conexion = await pool.connect();
    await conexion.query("BEGIN");

    const cliente = await conexion.query(
      `INSERT INTO clientes (nombre, telefono)
       VALUES ($1, $2)
       RETURNING id`,
      [nombre, telefono]
    );

    const turno = await conexion.query(
      `INSERT INTO turnos
         (cliente_id, servicio, fecha, hora, observaciones)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [cliente.rows[0].id, servicio, fecha, hora, observaciones || null]
    );

    await conexion.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "El turno quedó registrado.",
      id: turno.rows[0].id
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.query("ROLLBACK");
      } catch (errorRollback) {
        console.error("Error revirtiendo la transacción:", errorRollback);
      }
    }

    console.error("Error registrando turno:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });

    res.status(500).json({
      success: false,
      message: "No se pudo guardar el turno por un error del servidor. Revisá la consola del backend."
    });
  } finally {
    if (conexion) conexion.release();
  }
});

module.exports = router;
