'use strict';

const bcrypt = require('bcryptjs');

const { AccessDeniedException, AuthenticationException } = require('../exception/customException');

/**
 * The security configuration: password hashing, the authentication manager used by sign-in, the
 * request authorization rules, and the method-level role checks.
 *
 * Statelessness, CSRF and the frame options that `WebSecurityConfig` configures have no analogue
 * to switch off here — this application never creates a session, issues no cookies, and serves no
 * frames — so the parts that carry behaviour are what is reproduced.
 */

/** `new BCryptPasswordEncoder(12)`. */
function createPasswordEncoder(strength) {
  return {
    encode(rawPassword) {
      return bcrypt.hashSync(rawPassword, strength);
    },
    matches(rawPassword, encodedPassword) {
      if (!encodedPassword) {
        return false;
      }
      return bcrypt.compareSync(rawPassword, encodedPassword);
    },
  };
}

/**
 * Authenticates a username/password pair against the stored credentials, throwing
 * `AuthenticationException` on any failure — the same signal Spring's `AuthenticationManager`
 * raises, and which `UserService#signin` converts into a 422.
 */
function createAuthenticationManager({ myUserDetails, passwordEncoder }) {
  return {
    authenticate(username, password) {
      // An unknown username surfaces as `UsernameNotFoundException`, itself an
      // `AuthenticationException`, so a missing user and a wrong password fail the same way — as
      // they do in Spring, which hides the distinction by default.
      const userDetails = myUserDetails.loadUserByUsername(username);

      if (typeof password !== 'string' || !passwordEncoder.matches(password, userDetails.password)) {
        throw new AuthenticationException('Bad credentials');
      }

      return { principal: userDetails, authorities: userDetails.authorities };
    },
  };
}

/**
 * Paths matched by `permitAll()` in `authorizeHttpRequests`. The Java configuration also permits
 * `/h2-console/**`; there is no such console here, since the datasource is an in-process SQLite
 * database rather than an H2 server, so no rule is needed for it.
 */
const PERMIT_ALL_EXACT = new Set([
  '/users/signin',
  '/users/signup',
  '/users/refresh',
  '/users/logout',
  '/swagger-ui.html',
  '/swagger-ui',
]);

const PERMIT_ALL_PREFIXES = ['/v3/api-docs', '/swagger-ui/'];

function isPermitAll(path) {
  return PERMIT_ALL_EXACT.has(path) || PERMIT_ALL_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * `anyRequest().authenticated()`: everything outside the public paths needs an authenticated
 * caller. Denials go through the access denied handler, so an anonymous caller is told 403 rather
 * than being redirected to a login page that does not exist in a token-based API.
 */
function createAuthorizeHttpRequests() {
  return function authorizeHttpRequests(req, res, next) {
    if (isPermitAll(req.path) || req.authentication) {
      return next();
    }
    return next(new AccessDeniedException());
  };
}

/**
 * The method-security equivalent of `@PreAuthorize("hasRole('ROLE_ADMIN')")`. Spring's `hasRole`
 * leaves an argument that already carries the `ROLE_` prefix untouched, so these names are compared
 * against the granted authorities as-is.
 */
function preAuthorizeHasAnyRole(...roles) {
  return function preAuthorize(req, res, next) {
    const authorities = (req.authentication && req.authentication.authorities) || [];
    if (roles.some((role) => authorities.includes(role))) {
      return next();
    }
    return next(new AccessDeniedException());
  };
}

module.exports = {
  createPasswordEncoder,
  createAuthenticationManager,
  createAuthorizeHttpRequests,
  preAuthorizeHasAnyRole,
  isPermitAll,
};
