'use strict';

const {
  AccessDeniedException,
  CustomException,
  HttpStatus,
  MethodArgumentNotValidException,
} = require('./customException');
const { sendError } = require('../http/sendError');

/**
 * The single error sink, equivalent to `@RestControllerAdvice` with one `@ExceptionHandler` per
 * exception type. Express selects an error middleware by position rather than by argument type, so
 * the dispatch that Spring performs by signature is written out as an ordered chain.
 */
function createGlobalExceptionHandler({ logger = console } = {}) {
  return function handleException(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof CustomException) {
      return sendError(req, res, err.httpStatus, err.message);
    }

    if (err instanceof MethodArgumentNotValidException) {
      const firstError = err.fieldErrors[0];
      const message = firstError ? `${firstError.field}: ${firstError.message}` : 'Validation failed';
      return sendError(req, res, HttpStatus.BAD_REQUEST, message);
    }

    if (err instanceof AccessDeniedException) {
      return sendError(req, res, HttpStatus.FORBIDDEN, 'Access denied');
    }

    logger.error('Unhandled exception', err && err.stack ? err.stack : String(err));
    return sendError(req, res, HttpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong');
  };
}

module.exports = { createGlobalExceptionHandler };
