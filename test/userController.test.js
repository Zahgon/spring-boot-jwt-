'use strict';

const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const request = require('supertest');

const { createApplication } = require('../src/app');

const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin123456';

describe('UserControllerTest', () => {
  let app;
  let db;

  before(() => {
    ({ app, db } = createApplication());
  });

  after(() => {
    db.close();
  });

  /** Signs in and returns the token pair as {accessToken, refreshToken, ...}. */
  async function signin() {
    const res = await request(app)
      .post('/users/signin')
      .query({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    assert.equal(res.status, 200);
    return res.body;
  }

  function refreshBody(refreshToken) {
    return { refreshToken };
  }

  it('signin_withValidCredentials_returnsTokenPair', async () => {
    const tokens = await signin();
    assert.ok(tokens.accessToken.length > 20, 'Expected a JWT access token');
    assert.ok(tokens.refreshToken.length > 20, 'Expected a refresh token');
    assert.ok(tokens.expiresIn > 0, 'Expected a positive access token lifetime');
  });

  it('me_withoutToken_returns403', async () => {
    const res = await request(app).get('/users/me');
    assert.equal(res.status, 403);
  });

  it('me_withValidToken_returnsUserData', async () => {
    const { accessToken } = await signin();

    const res = await request(app).get('/users/me').set('Authorization', `Bearer ${accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.username, ADMIN_USER);
    assert.equal(res.body.email, 'admin@email.com');
    assert.ok(Array.isArray(res.body.appUserRoles));
  });

  it('refresh_withValidRefreshToken_returnsNewPair', async () => {
    const { refreshToken } = await signin();

    const res = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(res.status, 200);

    const refreshed = res.body;
    assert.ok(refreshed.accessToken.length > 20, 'Expected a new access token');
    assert.notEqual(refreshToken, refreshed.refreshToken, 'Refresh token should rotate');

    const me = await request(app).get('/users/me').set('Authorization', `Bearer ${refreshed.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.username, ADMIN_USER);
  });

  it('refresh_worksWithoutAccessToken', async () => {
    // The whole point of a refresh token: it works when the access token is expired or bogus.
    const { refreshToken } = await signin();

    const res = await request(app)
      .post('/users/refresh')
      .set('Authorization', 'Bearer expired-and-invalid')
      .send(refreshBody(refreshToken));

    assert.equal(res.status, 200);
  });

  it('refresh_reusingRotatedToken_returns401', async () => {
    const { refreshToken } = await signin();

    const first = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(first.status, 200);

    // Second use of the same token is a reuse attempt and must be rejected.
    const second = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(second.status, 401);
  });

  it('refresh_afterReuseDetection_revokesRemainingTokens', async () => {
    const { refreshToken } = await signin();

    const rotatedResponse = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(rotatedResponse.status, 200);
    const rotated = rotatedResponse.body.refreshToken;

    // Replaying the consumed token signals theft, which invalidates the whole family.
    const replay = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(replay.status, 401);

    const withRotated = await request(app).post('/users/refresh').send(refreshBody(rotated));
    assert.equal(withRotated.status, 401);
  });

  it('refresh_withUnknownToken_returns401', async () => {
    const res = await request(app).post('/users/refresh').send(refreshBody('not-a-real-refresh-token'));
    assert.equal(res.status, 401);
  });

  it('refresh_withBlankToken_returns400', async () => {
    const res = await request(app).post('/users/refresh').send(refreshBody(''));
    assert.equal(res.status, 400);
  });

  it('logout_revokesRefreshToken', async () => {
    const { refreshToken } = await signin();

    const logout = await request(app).post('/users/logout').send(refreshBody(refreshToken));
    assert.equal(logout.status, 204);

    const refresh = await request(app).post('/users/refresh').send(refreshBody(refreshToken));
    assert.equal(refresh.status, 401);
  });

  it('logout_withUnknownToken_isIdempotent', async () => {
    const res = await request(app).post('/users/logout').send(refreshBody('never-issued'));
    assert.equal(res.status, 204);
  });

  it('signup_returnsTokenPair', async () => {
    const res = await request(app).post('/users/signup').send({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password12',
      appUserRoles: ['ROLE_CLIENT'],
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken.length > 20, 'Expected a JWT access token');
    assert.ok(res.body.refreshToken.length > 20, 'Expected a refresh token');
  });

  it('signup_duplicateUsername_returns422', async () => {
    const res = await request(app).post('/users/signup').send({
      username: 'admin',
      email: 'other@example.com',
      password: 'password12',
      appUserRoles: ['ROLE_CLIENT'],
    });

    assert.equal(res.status, 422);
  });

  it('me_withMalformedToken_returns401', async () => {
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer not-a-valid-jwt');
    assert.equal(res.status, 401);
  });
});
