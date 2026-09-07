'use strict';

/** The subset of `org.springframework.http.HttpStatus` this application uses. */
const HttpStatus = Object.freeze({
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
});

const REASON_PHRASES = Object.freeze({
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
});

function reasonPhrase(status) {
  return REASON_PHRASES[status] || 'Error';
}

module.exports = { HttpStatus, reasonPhrase };
