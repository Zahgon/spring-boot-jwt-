'use strict';

const { AppUser } = require('../model/appUser');

/**
 * The counterpart of `UserRepository extends JpaRepository<AppUser, Integer>`. Spring Data derives
 * the queries from the method names; here they are written out, but the surface is deliberately
 * identical: `existsByUsername`, `findByUsername`, `deleteByUsername` and `save`.
 *
 * `appUserRoles` is an `@ElementCollection(fetch = FetchType.EAGER)`, so roles are always loaded
 * alongside the user rather than lazily.
 */
function createUserRepository(db) {
  const selectByUsername = db.prepare('SELECT id, username, email, password FROM app_user WHERE username = ?');
  const selectRoles = db.prepare('SELECT app_user_roles FROM app_user_app_user_roles WHERE app_user_id = ?');
  const countByUsername = db.prepare('SELECT COUNT(*) AS count FROM app_user WHERE username = ?');
  const insertUser = db.prepare('INSERT INTO app_user (username, email, password) VALUES (?, ?, ?)');
  const updateUser = db.prepare('UPDATE app_user SET username = ?, email = ?, password = ? WHERE id = ?');
  const deleteRoles = db.prepare('DELETE FROM app_user_app_user_roles WHERE app_user_id = ?');
  const insertRole = db.prepare('INSERT INTO app_user_app_user_roles (app_user_id, app_user_roles) VALUES (?, ?)');
  const deleteUserByUsername = db.prepare('DELETE FROM app_user WHERE username = ?');

  function loadRoles(userId) {
    return selectRoles.all(userId).map((row) => row.app_user_roles);
  }

  function toEntity(row) {
    return new AppUser({
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password,
      appUserRoles: loadRoles(row.id),
    });
  }

  return {
    existsByUsername(username) {
      return countByUsername.get(username).count > 0;
    },

    /** Returns the user, or `null` when there is none — mirroring the Java method's nullability. */
    findByUsername(username) {
      const row = selectByUsername.get(username);
      return row ? toEntity(row) : null;
    },

    save(appUser) {
      if (appUser.id === null || appUser.id === undefined) {
        const result = insertUser.run(appUser.username, appUser.email, appUser.password);
        appUser.id = Number(result.lastInsertRowid);
      } else {
        updateUser.run(appUser.username, appUser.email, appUser.password, appUser.id);
      }

      deleteRoles.run(appUser.id);
      for (const role of appUser.appUserRoles || []) {
        insertRole.run(appUser.id, role);
      }

      return appUser;
    },

    deleteByUsername(username) {
      const row = selectByUsername.get(username);
      if (!row) {
        return;
      }
      deleteRoles.run(row.id);
      deleteUserByUsername.run(username);
    },
  };
}

module.exports = { createUserRepository };
