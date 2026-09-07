'use strict';

const { RefreshToken } = require('../model/refreshToken');

/**
 * The counterpart of `RefreshTokenRepository extends JpaRepository<RefreshToken, Integer>`,
 * including the `@Modifying` bulk update behind `revokeAllByUsername`, which returns the number of
 * rows it revoked.
 */
function createRefreshTokenRepository(db) {
  const selectByTokenHash = db.prepare(
    'SELECT id, token_hash, username, expiry_date, revoked FROM refresh_token WHERE token_hash = ?',
  );
  const insertToken = db.prepare(
    'INSERT INTO refresh_token (token_hash, username, expiry_date, revoked) VALUES (?, ?, ?, ?)',
  );
  const updateToken = db.prepare(
    'UPDATE refresh_token SET token_hash = ?, username = ?, expiry_date = ?, revoked = ? WHERE id = ?',
  );
  const deleteTokensByUsername = db.prepare('DELETE FROM refresh_token WHERE username = ?');
  const revokeTokensByUsername = db.prepare(
    'UPDATE refresh_token SET revoked = 1 WHERE username = ? AND revoked = 0',
  );

  function toEntity(row) {
    return new RefreshToken({
      id: row.id,
      tokenHash: row.token_hash,
      username: row.username,
      expiryDate: Number(row.expiry_date),
      revoked: row.revoked === 1,
    });
  }

  return {
    /** Returns the token, or `null` where the Java method returns `Optional.empty()`. */
    findByTokenHash(tokenHash) {
      const row = selectByTokenHash.get(tokenHash);
      return row ? toEntity(row) : null;
    },

    save(refreshToken) {
      const revoked = refreshToken.revoked ? 1 : 0;
      if (refreshToken.id === null || refreshToken.id === undefined) {
        const result = insertToken.run(
          refreshToken.tokenHash,
          refreshToken.username,
          refreshToken.expiryDate,
          revoked,
        );
        refreshToken.id = Number(result.lastInsertRowid);
      } else {
        updateToken.run(
          refreshToken.tokenHash,
          refreshToken.username,
          refreshToken.expiryDate,
          revoked,
          refreshToken.id,
        );
      }
      return refreshToken;
    },

    deleteByUsername(username) {
      deleteTokensByUsername.run(username);
    },

    /** Revokes every live token for the user and reports how many were affected. */
    revokeAllByUsername(username) {
      return Number(revokeTokensByUsername.run(username).changes);
    },
  };
}

module.exports = { createRefreshTokenRepository };
