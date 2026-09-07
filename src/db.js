'use strict';

const { DatabaseSync } = require('node:sqlite');

/**
 * The datasource. Spring Boot runs an in-memory H2 database under the `dev` profile with
 * `ddl-auto: create-drop`; the closest dependency-free equivalent in Node is the built-in
 * `node:sqlite` module backed by `:memory:`, with the schema created at startup.
 *
 * The schema below is what Hibernate would generate from the `AppUser`, `RefreshToken` and
 * `@ElementCollection` mappings: a join table for the user's roles, a unique token hash, and an
 * index on `refresh_token.username`.
 */
function createDataSource() {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE app_user (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email    TEXT NOT NULL UNIQUE,
      password TEXT
    );

    CREATE TABLE app_user_app_user_roles (
      app_user_id    INTEGER NOT NULL,
      app_user_roles TEXT NOT NULL,
      FOREIGN KEY (app_user_id) REFERENCES app_user (id)
    );

    CREATE TABLE refresh_token (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash  TEXT NOT NULL UNIQUE,
      username    TEXT NOT NULL,
      expiry_date INTEGER NOT NULL,
      revoked     INTEGER NOT NULL
    );

    CREATE INDEX idx_refresh_token_username ON refresh_token (username);
  `);

  return db;
}

module.exports = { createDataSource };
