'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const { CustomException, HttpStatus } = require('../exception/customException');
const { getAuthority } = require('../model/appUserRole');

/**
 * Creates and verifies the stateless access tokens.
 *
 * The signing key is derived exactly as in the Java service: the configured secret is hashed with
 * SHA-256 and the resulting 256 bits are used as the HMAC key. That derivation is what lets a short
 * human-readable secret satisfy HS256's key-length requirement, and keeping it identical means a
 * token minted by either implementation verifies against the other.
 */
function createJwtTokenProvider({ config, myUserDetails, logger = console }) {
  const secretKey = config.security.jwt.token.secretKey;
  const validityInMilliseconds = config.security.jwt.token.expireLength;

  // `@PostConstruct init()`
  const signingKey = crypto.createHash('sha256').update(secretKey, 'utf8').digest();

  return {
    createToken(username, appUserRoles) {
      const roleNames = (appUserRoles || []).map(getAuthority);
      const now = Date.now();
      const validity = now + validityInMilliseconds;

      return jwt.sign(
        {
          sub: username,
          auth: roleNames,
          // JJWT writes `iat`/`exp` as epoch seconds; matching that keeps the payload identical.
          iat: Math.floor(now / 1000),
          exp: Math.floor(validity / 1000),
        },
        signingKey,
        // JJWT writes a bare `{"alg":"HS256"}` header, so the otherwise-default `typ` is dropped
        // to keep the two implementations byte-identical on the wire.
        { algorithm: 'HS256', header: { alg: 'HS256', typ: undefined } },
      );
    },

    /** Access token lifetime in seconds, as reported to clients in the auth response. */
    getValidityInSeconds() {
      return Math.floor(validityInMilliseconds / 1000);
    },

    getAuthentication(token) {
      const userDetails = myUserDetails.loadUserByUsername(this.getUsername(token));
      return { principal: userDetails, credentials: '', authorities: userDetails.authorities };
    },

    getUsername(token) {
      const claims = jwt.verify(token, signingKey, { algorithms: ['HS256'] });
      return claims.sub;
    },

    resolveToken(req) {
      const bearerToken = req.get ? req.get('Authorization') : req.headers.authorization;
      if (bearerToken && bearerToken.startsWith('Bearer ')) {
        return bearerToken.substring(7);
      }
      return null;
    },

    validateToken(token) {
      try {
        jwt.verify(token, signingKey, { algorithms: ['HS256'] });
        return true;
      } catch (e) {
        logger.debug('Invalid JWT token', e.message);
        throw new CustomException('Expired or invalid JWT token', HttpStatus.UNAUTHORIZED);
      }
    },
  };
}

module.exports = { createJwtTokenProvider };
