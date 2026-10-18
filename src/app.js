const express = require('express');
const cors = require('cors');
const registroRoutes = require('./routes/registro.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Crea la ruta /api/registro para recibir nuevas solicitudes de registro.
app.use('/api', registroRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor MediTunja activo en http://localhost:${PORT}`);
});

module.exports = app;