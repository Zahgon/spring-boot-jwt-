'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const defaultConfig = require('./config');
const defaultLogger = require('./logger');
const { createDataSource } = require('./db');
const { openApiDocument } = require('./configuration/openApiConfig');
const { createUserController } = require('./controller/userController');
const { createGlobalExceptionHandler } = require('./exception/globalExceptionHandler');
const { AppUser } = require('./model/appUser');
const { AppUserRole } = require('./model/appUserRole');
const { createRefreshTokenRepository } = require('./repository/refreshTokenRepository');
const { createUserRepository } = require('./repository/userRepository');
const { createJwtTokenFilter } = require('./security/jwtTokenFilter');
const { createJwtTokenProvider } = require('./security/jwtTokenProvider');
const { createMyUserDetails } = require('./security/myUserDetails');
const {
  createAuthenticationManager,
  createAuthorizeHttpRequests,
  createPasswordEncoder,
} = require('./security/webSecurityConfig');
const { createRefreshTokenService } = require('./service/refreshTokenService');
const { createUserService } = require('./service/userService');

/**
 * Builds the application: the object graph Spring would assemble from component scanning, the
 * filter chain from `WebSecurityConfig`, and the demo users the `CommandLineRunner` seeds.
 */
function createApplication({ config = defaultConfig, logger = defaultLogger } = {}) {
  const db = createDataSource();

  const userRepository = createUserRepository(db);
  const refreshTokenRepository = createRefreshTokenRepository(db);

  const passwordEncoder = createPasswordEncoder(config.passwordEncoderStrength);
  const myUserDetails = createMyUserDetails({ userRepository });
  const jwtTokenProvider = createJwtTokenProvider({ config, myUserDetails, logger });
  const authenticationManager = createAuthenticationManager({ myUserDetails, passwordEncoder });

  const refreshTokenService = createRefreshTokenService({ refreshTokenRepository, config, logger });
  const userService = createUserService({
    userRepository,
    passwordEncoder,
    jwtTokenProvider,
    authenticationManager,
    refreshTokenService,
    logger,
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(createJwtTokenFilter({ jwtTokenProvider, logger }));
  app.use(createAuthorizeHttpRequests());

  app.get('/v3/api-docs', (req, res) => res.json(openApiDocument));
  app.get('/swagger-ui.html', (req, res) => res.redirect('/swagger-ui/index.html'));
  app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use('/users', createUserController({ userService }));

  app.use(createGlobalExceptionHandler({ logger }));

  run({ userRepository, userService });

  return { app, db, userRepository, refreshTokenRepository, userService, jwtTokenProvider, refreshTokenService };
}

/** The `CommandLineRunner`: seeds the two demo accounts, skipping any that already exist. */
function run({ userRepository, userService }) {
  if (!userRepository.existsByUsername('admin')) {
    userService.register(
      new AppUser({
        username: 'admin',
        password: 'admin123456',
        email: 'admin@email.com',
        appUserRoles: [AppUserRole.ROLE_ADMIN],
      }),
    );
  }

  if (!userRepository.existsByUsername('client')) {
    userService.register(
      new AppUser({
        username: 'client',
        password: 'client123456',
        email: 'client@email.com',
        appUserRoles: [AppUserRole.ROLE_CLIENT],
      }),
    );
  }
}

function main() {
  const { app } = createApplication();
  const { port } = defaultConfig.server;
  app.listen(port, () => defaultLogger.info(`Started JwtAuthServiceApp on port ${port}`));
}

if (require.main === module) {
  main();
}

module.exports = { createApplication, main };
