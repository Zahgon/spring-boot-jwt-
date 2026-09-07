'use strict';

const { CustomException } = require('../exception/customException');
const { sendError } = require('../http/sendError');

/**
 * Endpoints that authenticate by other means and must stay reachable with an expired access
 * token — refreshing is exactly what a client does once its access token is no longer valid, and
 * clients routinely keep sending the stale Authorization header while doing so.
 */
const UNAUTHENTICATED_PATHS = new Set(['/users/signin', '/users/signup', '/users/refresh', '/users/logout']);

/**
 * The `OncePerRequestFilter` that turns a bearer token into an authenticated principal, expressed
 * as Express middleware. A missing token is not an error here — authorization decides what an
 * unauthenticated caller may reach — but a *bad* token fails the request outright.
 */
function createJwtTokenFilter({ jwtTokenProvider, logger = console }) {
  function shouldNotFilter(req) {
    return UNAUTHENTICATED_PATHS.has(req.path);
  }

  return function jwtTokenFilter(req, res, next) {
    if (shouldNotFilter(req)) {
      return next();
    }

    const token = jwtTokenProvider.resolveToken(req);
    try {
      if (token !== null && jwtTokenProvider.validateToken(token)) {
        req.authentication = jwtTokenProvider.getAuthentication(token);
      }
    } catch (ex) {
      if (ex instanceof CustomException) {
        logger.debug(`JWT authentication failed: ${ex.message}`);
        // this is very important, since it guarantees the user is not authenticated at all
        req.authentication = null;
        return sendError(req, res, ex.httpStatus, ex.message);
      }
      return next(ex);
    }

    return next();
  };
}

module.exports = { createJwtTokenFilter, UNAUTHENTICATED_PATHS };
