'use strict';

const { HttpStatus } = require('../http/httpStatus');

/**
 * The application's own runtime exception, carrying the HTTP status the request should fail with —
 * the direct equivalent of `murraco.exception.CustomException`.
 */
class CustomException extends Error {
  constructor(message, httpStatus) {
    super(message);
    this.name = 'CustomException';
    this.httpStatus = httpStatus;
  }
}

/**
 * Raised when credentials cannot be authenticated. Spring Security throws
 * `AuthenticationException` from the `AuthenticationManager`; `UserService#signin` catches it and
 * translates it into a 422.
 */
class AuthenticationException extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationException';
  }
}

/** Spring Security's `UsernameNotFoundException`, thrown by the user details lookup. */
class UsernameNotFoundException extends AuthenticationException {
  constructor(message) {
    super(message);
    this.name = 'UsernameNotFoundException';
  }
}

/**
 * Raised when an authenticated (or anonymous) caller lacks the required role. Handled centrally
 * into a 403, as the `accessDeniedHandler` in `WebSecurityConfig` does.
 */
class AccessDeniedException extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedException';
  }
}

/**
 * Raised when request body or parameter validation fails, carrying the field errors in declaration
 * order. Named after Spring's `MethodArgumentNotValidException`, whose first field error the global
 * handler turns into a 400.
 */
class MethodArgumentNotValidException extends Error {
  constructor(fieldErrors) {
    super('Validation failed');
    this.name = 'MethodArgumentNotValidException';
    this.fieldErrors = fieldErrors;
  }
}

module.exports = {
  CustomException,
  AuthenticationException,
  UsernameNotFoundException,
  AccessDeniedException,
  MethodArgumentNotValidException,
  HttpStatus,
};
