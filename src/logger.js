'use strict';

/**
 * A minimal logger standing in for SLF4J. Spring Boot logs at INFO by default, which is why the
 * `log.debug` calls in the filter and the token provider stay silent unless `LOG_LEVEL=debug`.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, off: 100 };

const threshold = LEVELS[String(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

function write(level, stream, args) {
  if (LEVELS[level] < threshold) {
    return;
  }
  stream.write(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${args.join(' ')}\n`);
}

const logger = {
  debug: (...args) => write('debug', process.stdout, args),
  info: (...args) => write('info', process.stdout, args),
  warn: (...args) => write('warn', process.stderr, args),
  error: (...args) => write('error', process.stderr, args),
};

module.exports = logger;
