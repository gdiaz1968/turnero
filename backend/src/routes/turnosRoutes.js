const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

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
    console.error("Error consultando turnos:", error.message);
    res.status(500).json({
      success: false,
      message: "No se pudieron consultar los turnos."
    });
  }
});

// Registrar cliente y turno en una única operación.
router.post("/", async (req, res) => {
  const nombre = String(req.body.nombre || "").trim();
  const telefono = String(req.body.telefono || "").trim();
  const servicio = String(req.body.servicio || "").trim();
  const fecha = String(req.body.fecha || "").trim();
  const hora = String(req.body.hora || "").trim();
  const observaciones = String(req.body.observaciones || "").trim();

  if (!nombre || !telefono || !servicio || !fecha || !hora) {
    return res.status(400).json({
      success: false,
      message: "Completá nombre, teléfono, servicio, fecha y hora."
    });
  }

  if (
    nombre.length > 120 ||
    telefono.length > 40 ||
    servicio.length > 120 ||
    observaciones.length > 1000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !/^\d{2}:\d{2}$/.test(hora)
  ) {
    return res.status(400).json({
      success: false,
      message: "Revisá los datos ingresados."
    });
  }

  const conexion = await pool.connect();

  try {
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
    await conexion.query("ROLLBACK");
    console.error("Error registrando turno:", error.message);
    res.status(400).json({
      success: false,
      message: "No se pudo registrar el turno. Verificá la fecha y la hora."
    });
  } finally {
    conexion.release();
  }
});

module.exports = router;
