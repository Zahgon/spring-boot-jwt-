'use strict';

const { reasonPhrase } = require('./httpStatus');

/**
 * Writes an error response in the shape Spring produces for `HttpServletResponse#sendError`, which
 * is rendered by `DefaultErrorAttributes`: a timestamp, the status and its reason phrase, the
 * message, and the request path.
 *
 * `GlobalExceptionHandlerController` overrides the error attributes to exclude the `exception`
 * field, so stack-trace-adjacent details never reach the client; that exclusion is inherent here,
 * since only these five fields are ever written.
 */
function sendError(req, res, status, message) {
  if (res.headersSent) {
    return;
  }
  res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: reasonPhrase(status),
    message,
    path: req.originalUrl ? req.originalUrl.split('?')[0] : req.path,
  });
}

module.exports = { sendError };
