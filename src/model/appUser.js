'use strict';

/**
 * A user account. The Java entity relies on Lombok's `@Data` for accessors and on JPA annotations
 * for the mapping; here the fields are plain properties and the mapping lives in the repository.
 */
class AppUser {
  constructor({ id = null, username = null, email = null, password = null, appUserRoles = null } = {}) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.appUserRoles = appUserRoles;
  }
}

module.exports = { AppUser };
