
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3032;

// Middlewares
app.use(cors());
app.use(express.json());

// Comprobación del servidor
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TURNERO API funcionando correctamente",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

app.listen(PORT, () => {
  console.log(`TURNERO API ejecutándose en puerto ${PORT}`);
});
