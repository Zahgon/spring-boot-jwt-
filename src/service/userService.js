'use strict';

const { AuthResponseDTO } = require('../dto');
const { AuthenticationException, CustomException, HttpStatus } = require('../exception/customException');

const TOKEN_TYPE = 'Bearer';

/**
 * The application service behind the user endpoints: sign-in, sign-up, lookup, deletion, and the
 * refresh/logout pair that the refresh token service ultimately backs.
 */
function createUserService({
  userRepository,
  passwordEncoder,
  jwtTokenProvider,
  authenticationManager,
  refreshTokenService,
  logger = console,
}) {
  function issueTokens(appUser) {
    const accessToken = jwtTokenProvider.createToken(appUser.username, appUser.appUserRoles);
    const refreshToken = refreshTokenService.issue(appUser.username);
    return new AuthResponseDTO(accessToken, refreshToken, TOKEN_TYPE, jwtTokenProvider.getValidityInSeconds());
  }

  return {
    signin(username, password) {
      try {
        authenticationManager.authenticate(username, password);
      } catch (e) {
        if (e instanceof AuthenticationException) {
          throw new CustomException('Invalid username/password supplied', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        throw e;
      }
      logger.info(`User signed in: ${username}`);
      return issueTokens(userRepository.findByUsername(username));
    },

    signup(appUser) {
      return issueTokens(this.register(appUser));
    },

    /** Persists a new user without issuing tokens, e.g. when seeding demo accounts on startup. */
    register(appUser) {
      if (userRepository.existsByUsername(appUser.username)) {
        throw new CustomException('Username is already in use', HttpStatus.UNPROCESSABLE_ENTITY);
      }
      appUser.password = passwordEncoder.encode(appUser.password);
      userRepository.save(appUser);
      logger.info(`User signed up: ${appUser.username}`);
      return appUser;
    },

    delete(username) {
      refreshTokenService.deleteAllForUser(username);
      userRepository.deleteByUsername(username);
    },

    search(username) {
      const appUser = userRepository.findByUsername(username);
      if (appUser === null) {
        throw new CustomException("The user doesn't exist", HttpStatus.NOT_FOUND);
      }
      return appUser;
    },

    whoami(req) {
      const token = jwtTokenProvider.resolveToken(req);
      if (token === null) {
        throw new CustomException('Missing or invalid Authorization header', HttpStatus.UNAUTHORIZED);
      }
      const appUser = userRepository.findByUsername(jwtTokenProvider.getUsername(token));
      if (appUser === null) {
        throw new CustomException("The user doesn't exist", HttpStatus.NOT_FOUND);
      }
      return appUser;
    },

    /**
     * Exchanges a refresh token for a fresh token pair. The presented refresh token is consumed:
     * a new one is returned and must replace it on the client.
     */
    refresh(refreshToken) {
      const rotation = refreshTokenService.rotate(refreshToken);

      const appUser = userRepository.findByUsername(rotation.username);
      if (appUser === null) {
        throw new CustomException("The user doesn't exist", HttpStatus.NOT_FOUND);
      }

      const accessToken = jwtTokenProvider.createToken(appUser.username, appUser.appUserRoles);
      logger.info(`Refreshed tokens for user: ${appUser.username}`);
      return new AuthResponseDTO(
        accessToken,
        rotation.newRefreshToken,
        TOKEN_TYPE,
        jwtTokenProvider.getValidityInSeconds(),
      );
    },

    /** Revokes a refresh token so it can no longer be exchanged. */
    logout(refreshToken) {
      refreshTokenService.revoke(refreshToken);
    },
  };
}

module.exports = { createUserService };
