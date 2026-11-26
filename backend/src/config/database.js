const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("Falta configurar DATABASE_URL en backend/.env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined
});

// Neon puede cerrar conexiones que quedaron inactivas. pg-pool elimina
// ese cliente del pool y emite este evento; manejarlo evita que Node.js
// termine el proceso por un error no gestionado.
pool.on("error", (error) => {
  console.error(
    "Conexión inactiva de PostgreSQL cerrada; el pool descartó el cliente:",
    error.message
  );
});

async function probarConexion() {
  try {
    const resultado = await pool.query(
      "SELECT current_database() AS base_datos, NOW() AS fecha"
    );
    console.log("PostgreSQL conectado correctamente");
    console.log("Base de datos:", resultado.rows[0].base_datos);
    return true;
  } catch (error) {
    console.error("Error conectando con PostgreSQL:", error.message);
    return false;
  }
}

module.exports = { pool, probarConexion };
