const logger = (req, res, next) => {
  const start = Date.now();
  
  // Intercept the response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const isSuccess = status >= 200 && status < 300;
    const label = isSuccess ? 'SUCCESS' : 'FAILURE';
    
    // Minimal, professional logging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | ${label} ${status} | ${duration}ms`);
  });

  next();
};

module.exports = logger;
