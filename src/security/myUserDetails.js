'use strict';

const { UsernameNotFoundException } = require('../exception/customException');
const { getAuthority } = require('../model/appUserRole');

/**
 * The equivalent of implementing `UserDetailsService`: it retrieves user-related data by username
 * and is used while authenticating a request, both for password sign-in and for turning a valid
 * access token back into an authenticated principal.
 */
function createMyUserDetails({ userRepository }) {
  return {
    loadUserByUsername(username) {
      const appUser = userRepository.findByUsername(username);

      if (appUser === null) {
        throw new UsernameNotFoundException(`User '${username}' not found`);
      }

      return {
        username,
        password: appUser.password,
        authorities: (appUser.appUserRoles || []).map(getAuthority),
        accountExpired: false,
        accountLocked: false,
        credentialsExpired: false,
        disabled: false,
      };
    },
  };
}

module.exports = { createMyUserDetails };
