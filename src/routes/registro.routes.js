const express = require('express');
const router = express.Router();
const { registrarUsuario } = require('../controllers/registro.controller');

router.post('/registro', registrarUsuario);

module.exports = router;