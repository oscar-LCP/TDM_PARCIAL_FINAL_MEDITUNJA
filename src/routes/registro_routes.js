const express = require('express');
const router = express.Router();
const { registrarUsuario } = require('../controllers/registro_controller');
const { iniciarSesion } = require('../controllers/login_controller');
const autenticarSesion = require('../middleware/autenticar_sesion');

router.post('/registro', registrarUsuario);
router.post('/login', iniciarSesion);

router.use(autenticarSesion);

router.get('/sesion', (req, res) => {
  res.status(200).json({
    mensaje: 'Sesión activa y renovada por actividad.',
    expira_en: new Date(req.sesionExpiraEn).toISOString(),
    data: req.usuario
  });
});

module.exports = router;