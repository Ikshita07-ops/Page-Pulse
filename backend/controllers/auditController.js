const auditService = require('../services/auditService');
const { isValidUrl } = require('../utils/urlValidator');
const { ValidationError } = require('../utils/errors');

const audit = async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url || !isValidUrl(url)) {
      throw new ValidationError('Invalid URL provided.');
    }

    const data = await auditService.auditUrl(url);
    
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  audit
};
