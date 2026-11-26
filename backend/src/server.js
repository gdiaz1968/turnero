const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { pool, probarConexion } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3032;

// Middlewares
app.use(cors());
app.use(express.json());

// Estado de la API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TURNERO API funcionando correctamente",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Estado de PostgreSQL
app.get("/api/health/db", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        NOW() AS fecha,
        current_database() AS base_datos
    `);

    res.status(200).json({
      success: true,
      message: "PostgreSQL conectado correctamente",
      database: resultado.rows[0].base_datos,
      timestamp: resultado.rows[0].fecha
    });
  } catch (error) {
    console.error("Error verificando PostgreSQL:", error.message);

    res.status(503).json({
      success: false,
      message: "Base de datos no disponible"
    });
  }
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

// Inicio del servidor
async function iniciarServidor() {
  const conexionDisponible = await probarConexion();

  if (!conexionDisponible) {
    console.error(
      "ADVERTENCIA: el servidor iniciará sin conexión a PostgreSQL."
    );
  }

  const server = app.listen(PORT, () => {
    console.log(`TURNERO API ejecutándose en puerto ${PORT}`);
  });

  // Cierre ordenado del servidor y del pool PostgreSQL
  const cerrarServidor = (senal) => {
    console.log(`Recibida señal ${senal}. Cerrando servidor...`);

    server.close(async () => {
      try {
        await pool.end();
        console.log("Conexiones PostgreSQL cerradas.");
        process.exit(0);
      } catch (error) {
        console.error("Error cerrando PostgreSQL:", error.message);
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", () => cerrarServidor("SIGINT"));
  process.once("SIGTERM", () => cerrarServidor("SIGTERM"));
}

iniciarServidor().catch((error) => {
  console.error("Error iniciando TURNERO:", error.message);
  process.exit(1);
});
