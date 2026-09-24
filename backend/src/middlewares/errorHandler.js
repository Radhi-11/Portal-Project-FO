function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  if (err.code === '23505') {
    const message = 'Resource already exists';
    error = new Error(message);
    error.status = 409;
  }

  res.status(error.status || err.status || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
