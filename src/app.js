const express = require('express');
const cors = require('cors');
const path = require('node:path');
const registroRoutes = require('./routes/registro_routes');
const { ready: baseDatosLista } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '7mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Crea la ruta /api/registro para recibir nuevas solicitudes de registro.
app.use('/api', registroRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  baseDatosLista
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor MediTunja activo en http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('No se pudo inicializar la base de datos SQLite:', error);
      process.exitCode = 1;
    });
}

module.exports = app;