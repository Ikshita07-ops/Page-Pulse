const express = require('express');
const cors = require('cors');
const auditRoutes = require('./routes/auditRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use(logger);

app.use('/api/audit', auditRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
