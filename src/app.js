const express = require('express');
const cors = require('cors');
const path = require('node:path');
const registroRoutes = require('./routes/registro_routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '7mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Crea la ruta /api/registro para recibir nuevas solicitudes de registro.
app.use('/api', registroRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor MediTunja activo en http://localhost:${PORT}`);
  });
}

module.exports = app;