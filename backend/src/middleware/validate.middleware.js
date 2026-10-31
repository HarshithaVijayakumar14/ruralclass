export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors ? err.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : err.message
    });
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter validation failed',
      details: err.errors ? err.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : err.message
    });
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Route parameter validation failed',
      details: err.errors ? err.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : err.message
    });
  }
};

