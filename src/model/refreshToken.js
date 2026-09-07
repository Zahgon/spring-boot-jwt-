'use strict';

/**
 * A refresh token issued to a user. Only the SHA-256 hash of the token is stored, so a database
 * leak does not hand out usable tokens. Tokens are single-use: refreshing revokes the presented
 * token and issues a new one.
 *
 * `expiryDate` is held as epoch milliseconds — the Java entity uses `java.time.Instant`, and
 * milliseconds are what both sides compare against "now".
 */
class RefreshToken {
  constructor({ id = null, tokenHash = null, username = null, expiryDate = null, revoked = false } = {}) {
    this.id = id;
    this.tokenHash = tokenHash;
    this.username = username;
    this.expiryDate = expiryDate;
    this.revoked = revoked;
  }

  isExpired() {
    return this.expiryDate < Date.now();
  }
}

module.exports = { RefreshToken };
