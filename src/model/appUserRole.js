'use strict';

/**
 * The roles a user can hold. In Java this is an enum implementing `GrantedAuthority`, where the
 * authority name is the enum constant itself — hence `getAuthority()` returning `name()`.
 */
const AppUserRole = Object.freeze({
  ROLE_ADMIN: 'ROLE_ADMIN',
  ROLE_CLIENT: 'ROLE_CLIENT',
});

const VALUES = Object.freeze(Object.values(AppUserRole));

/** The authority string granted by a role, i.e. the role name itself. */
function getAuthority(role) {
  return role;
}

/** True when the given string names a role, used to reject unknown roles on signup. */
function isAppUserRole(value) {
  return typeof value === 'string' && VALUES.includes(value);
}

module.exports = { AppUserRole, values: VALUES, getAuthority, isAppUserRole };
