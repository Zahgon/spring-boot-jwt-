'use strict';

/**
 * Application configuration — the JavaScript counterpart of `application.yml` and
 * `application-dev.yml`.
 *
 * Spring resolves `${JWT_SECRET:secret-key}` placeholders from the environment, falling back to
 * the literal after the colon. The same defaults are reproduced here, so the two applications can
 * be driven by an identical environment.
 */

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${name}: ${raw}`);
  }
  return parsed;
}

const config = {
  security: {
    jwt: {
      token: {
        // For production, set JWT_SECRET (and optionally JWT_EXPIRE_MS) via environment
        // variables. Do not use the default in production.
        secretKey: process.env.JWT_SECRET || 'secret-key',
        // 5 minutes default; override with JWT_EXPIRE_MS (milliseconds)
        expireLength: intFromEnv('JWT_EXPIRE_MS', 300000),
      },
      refreshToken: {
        // 7 days default; override with JWT_REFRESH_EXPIRE_MS (milliseconds)
        expireLength: intFromEnv('JWT_REFRESH_EXPIRE_MS', 604800000),
      },
    },
  },
  server: {
    port: intFromEnv('PORT', 8080),
  },
  // BCrypt strength, matching `new BCryptPasswordEncoder(12)`.
  passwordEncoderStrength: intFromEnv('BCRYPT_STRENGTH', 12),
};

module.exports = config;
