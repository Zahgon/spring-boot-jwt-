'use strict';

const express = require('express');

const { toAppUser, toRefreshToken, toUserResponseDTO } = require('../dto');
const { HttpStatus } = require('../http/httpStatus');
const { preAuthorizeHasAnyRole } = require('../security/webSecurityConfig');

/**
 * Reads a `@RequestParam`, which Spring populates from the query string or a form-encoded body.
 *
 * A missing one aborts before the handler runs and, because the advice registers a handler for
 * `Exception`, is reported as a 500 rather than a 400 — reproduced here so both services answer a
 * malformed sign-in identically.
 */
function requestParam(req, name) {
  const value = req.query[name] !== undefined ? req.query[name] : req.body && req.body[name];
  if (typeof value !== 'string') {
    throw new Error(`Required request parameter '${name}' for method parameter type String is not present`);
  }
  return value;
}

function createUserController({ userService }) {
  const router = express.Router();

  router.post('/signin', (req, res) => {
    res.json(userService.signin(requestParam(req, 'username'), requestParam(req, 'password')));
  });

  router.post('/signup', (req, res) => {
    res.json(userService.signup(toAppUser(req.body)));
  });

  router.post('/refresh', (req, res) => {
    res.json(userService.refresh(toRefreshToken(req.body)));
  });

  router.post('/logout', (req, res) => {
    userService.logout(toRefreshToken(req.body));
    res.status(HttpStatus.NO_CONTENT).end();
  });

  // Declared ahead of `/:username` so the literal path wins, the ordering Spring derives from
  // pattern specificity rather than from registration order.
  router.get('/me', preAuthorizeHasAnyRole('ROLE_ADMIN', 'ROLE_CLIENT'), (req, res) => {
    res.json(toUserResponseDTO(userService.whoami(req)));
  });

  router.get('/:username', preAuthorizeHasAnyRole('ROLE_ADMIN'), (req, res) => {
    res.json(toUserResponseDTO(userService.search(req.params.username)));
  });

  router.delete('/:username', preAuthorizeHasAnyRole('ROLE_ADMIN'), (req, res) => {
    userService.delete(req.params.username);
    res.type('text/plain').send(req.params.username);
  });

  return router;
}

module.exports = { createUserController };
