const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { pool } = require("../config/database");

const ESTADOS_VALIDOS = [
  "PENDIENTE",
  "CONFIRMADO",
  "RECHAZADO",
  "CANCELADO",
  "FINALIZADO"
];

const TRANSICIONES = {
  PENDIENTE: ["CONFIRMADO", "RECHAZADO", "CANCELADO"],
  REGISTRADO: ["CONFIRMADO", "RECHAZADO", "CANCELADO"],
  CONFIRMADO: ["CANCELADO", "FINALIZADO"],
  RECHAZADO: [],
  CANCELADO: [],
  FINALIZADO: []
};

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

function generarCodigoConsulta() {
  // Codigo aleatorio de 64 bits; solo se almacena su hash SHA-256.
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

function calcularHashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

// Consulta publica: el token autoriza a ver unicamente los datos no sensibles del turno.
router.get("/consulta/:token", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");

  const token = String(req.params.token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return res.status(404).json({
      success: false,
      message: "No se encontro una consulta valida para ese enlace."
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT
         servicio,
         TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
         TO_CHAR(hora, 'HH24:MI') AS hora,
         estado
       FROM turnos
       WHERE consulta_token_hash = $1
       LIMIT 1`,
      [calcularHashToken(token)]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "El enlace no existe o no es valido."
      });
    }

    res.json({
      success: true,
      turno: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error consultando estado publico del turno:", error);
    res.status(500).json({
      success: false,
      message: "No se pudo consultar el estado del turno. Intenta nuevamente."
    });
  }
});

// Consulta publica dentro de la pantalla del cliente: requiere telefono y codigo privado.
router.post("/consulta", async (req, res) => {
  res.set("Cache-Control", "no-store");

  const telefono = String((req.body || {}).telefono || "").replace(/\D/g, "");
  const codigo = String((req.body || {}).codigo || "")
    .trim()
    .replace(/-/g, "")
    .toLowerCase();

  if (telefono.length < 8 || telefono.length > 15 || !/^[a-f0-9]{16}$/.test(codigo)) {
    return res.status(400).json({
      success: false,
      message: "Ingresa el telefono y el codigo de consulta correctamente."
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT
         t.servicio,
         TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
         TO_CHAR(t.hora, 'HH24:MI') AS hora,
         t.estado
       FROM turnos t
       INNER JOIN clientes c ON c.id = t.cliente_id
       WHERE regexp_replace(c.telefono, '[^0-9]', '', 'g') = $1
         AND t.consulta_token_hash = $2
       LIMIT 1`,
      [telefono, calcularHashToken(codigo)]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No encontramos un turno con ese telefono y codigo. Verifica los datos e intenta nuevamente."
      });
    }

    return res.json({
      success: true,
      turno: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error consultando turno por telefono y codigo:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo consultar el turno. Intenta nuevamente."
    });
  }
});

// Listar turnos. Si se envia ?fecha=AAAA-MM-DD, filtra por ese dia.
router.get("/", async (req, res) => {
  try {
    const { fecha } = req.query;
    const parametros = [];
    let filtro = "";

    if (fecha) {
      if (!validarFecha(String(fecha))) {
        return res.status(400).json({
          success: false,
          message: "La fecha del filtro no es valida."
        });
      }
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

// Cambiar el estado de un turno desde la agenda profesional.
router.patch("/:id/estado", async (req, res) => {
  const id = Number(req.params.id);
  const nuevoEstado = String((req.body || {}).estado || "").trim().toUpperCase();

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "El identificador del turno no es valido." });
  }

  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return res.status(400).json({ success: false, message: "El estado solicitado no es valido." });
  }

  try {
    const actual = await pool.query(
      "SELECT estado FROM turnos WHERE id = $1",
      [id]
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({ success: false, message: "No se encontro el turno solicitado." });
    }

    const estadoActual = actual.rows[0].estado;
    if (!(TRANSICIONES[estadoActual] || []).includes(nuevoEstado)) {
      return res.status(409).json({
        success: false,
        message: "No se puede cambiar el turno desde " + estadoActual + " a " + nuevoEstado + "."
      });
    }

    const actualizado = await pool.query(
      `UPDATE turnos
       SET estado = $1
       WHERE id = $2
       RETURNING id, estado`,
      [nuevoEstado, id]
    );

    res.json({
      success: true,
      message: "El estado del turno fue actualizado.",
      turno: actualizado.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando estado del turno:", error);
    res.status(500).json({
      success: false,
      message: "No se pudo actualizar el estado del turno."
    });
  }
});

// Registrar cliente y turno en una unica operacion.
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
      message: "Completa nombre, telefono, servicio, fecha y hora."
    });
  }

  if (nombre.length > 120) {
    return res.status(400).json({ success: false, message: "El nombre no puede superar los 120 caracteres." });
  }

  if (telefono.length > 40) {
    return res.status(400).json({ success: false, message: "El telefono no puede superar los 40 caracteres." });
  }

  if (servicio.length > 120) {
    return res.status(400).json({ success: false, message: "El servicio no puede superar los 120 caracteres." });
  }

  if (observaciones.length > 1000) {
    return res.status(400).json({ success: false, message: "Las observaciones no pueden superar los 1000 caracteres." });
  }

  if (!validarFecha(fecha)) {
    return res.status(400).json({ success: false, message: "La fecha no es valida. Selecciona una fecha del calendario." });
  }

  if (!validarHora(hora)) {
    return res.status(400).json({ success: false, message: "La hora no es valida. Selecciona una hora valida." });
  }

  let conexion;
  const codigoConsulta = generarCodigoConsulta();
  const hashTokenConsulta = calcularHashToken(codigoConsulta);

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
         (cliente_id, servicio, fecha, hora, observaciones, consulta_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [cliente.rows[0].id, servicio, fecha, hora, observaciones || null, hashTokenConsulta]
    );

    await conexion.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "El turno quedo registrado como pendiente de confirmacion.",
      id: turno.rows[0].id,
      codigoConsulta
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.query("ROLLBACK");
      } catch (errorRollback) {
        console.error("Error revirtiendo la transaccion:", errorRollback);
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
      message: "No se pudo guardar el turno por un error del servidor. Revisa la consola del backend."
    });
  } finally {
    if (conexion) conexion.release();
  }
});

module.exports = router;
