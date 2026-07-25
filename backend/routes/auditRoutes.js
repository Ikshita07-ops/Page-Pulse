const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.post('/', auditController.audit);

module.exports = router;
