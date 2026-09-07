'use strict';

const crypto = require('node:crypto');

const { CustomException, HttpStatus } = require('../exception/customException');
const { RefreshToken } = require('../model/refreshToken');

/**
 * Issues, rotates and revokes refresh tokens.
 *
 * Refresh tokens are opaque random strings rather than JWTs: they are checked against the
 * database on every use, which is what makes them revocable. Only their hash is persisted.
 */

const TOKEN_BYTES = 32;

function hash(rawToken) {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function createRefreshTokenService({ refreshTokenRepository, config, logger = console }) {
  const refreshValidityInMilliseconds = config.security.jwt.refreshToken.expireLength;

  return {
    /** Creates a new refresh token for the user and returns the raw value (never stored). */
    issue(username) {
      const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');

      const refreshToken = new RefreshToken({
        tokenHash: hash(rawToken),
        username,
        expiryDate: Date.now() + refreshValidityInMilliseconds,
        revoked: false,
      });
      refreshTokenRepository.save(refreshToken);

      return rawToken;
    },

    /**
     * Validates the presented refresh token and rotates it: the old token is revoked and a new one
     * issued. Returns the username the token belongs to, along with its replacement.
     *
     * Presenting an already-revoked token is treated as a possible token theft (the legitimate
     * client and an attacker both hold a copy), so every token for that user is revoked. The
     * revocation is written before the request is rejected and, unlike the Java service — which
     * needs `dontRollbackOn` to keep it — nothing here can roll it back.
     */
    rotate(rawToken) {
      const refreshToken = refreshTokenRepository.findByTokenHash(hash(rawToken));
      if (refreshToken === null) {
        throw new CustomException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }

      if (refreshToken.revoked) {
        logger.warn(`Refresh token reuse detected for user ${refreshToken.username}; revoking all tokens`);
        refreshTokenRepository.revokeAllByUsername(refreshToken.username);
        throw new CustomException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }
      if (refreshToken.isExpired()) {
        throw new CustomException('Expired refresh token', HttpStatus.UNAUTHORIZED);
      }

      refreshToken.revoked = true;
      refreshTokenRepository.save(refreshToken);

      return { username: refreshToken.username, newRefreshToken: this.issue(refreshToken.username) };
    },

    /** Revokes the presented token. Unknown tokens are ignored so logout is always idempotent. */
    revoke(rawToken) {
      const refreshToken = refreshTokenRepository.findByTokenHash(hash(rawToken));
      if (refreshToken !== null) {
        refreshToken.revoked = true;
        refreshTokenRepository.save(refreshToken);
      }
    },

    /** Removes every token belonging to a user, e.g. when the account is deleted. */
    deleteAllForUser(username) {
      refreshTokenRepository.deleteByUsername(username);
    },
  };
}

module.exports = { createRefreshTokenService };
