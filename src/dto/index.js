'use strict';

/**
 * The data transfer objects. In Java these are Lombok `@Data` classes annotated for Bean
 * Validation and OpenAPI; here the validation rules live next to each factory, and the OpenAPI
 * schemas are declared in `configuration/openApiConfig.js`.
 *
 * `ModelMapper` is replaced by the explicit mapping functions below — the Java code only ever uses
 * it for two same-named-field conversions, so there is nothing to gain from a mapping library.
 */

const { AppUser } = require('../model/appUser');
const { isAppUserRole } = require('../model/appUserRole');
const { MethodArgumentNotValidException } = require('../exception/customException');

/** The token pair returned by signin, signup and refresh. */
class AuthResponseDTO {
  constructor(accessToken, refreshToken, tokenType, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenType = tokenType;
    this.expiresIn = expiresIn;
  }
}

// Bean Validation's default messages, reproduced so failure responses match the Java service.
const NOT_BLANK = 'must not be blank';
const NOT_A_WELL_FORMED_EMAIL = 'must be a well-formed email address';

function isBlank(value) {
  return value === undefined || value === null || typeof value !== 'string' || value.trim() === '';
}

// Deliberately permissive, like Hibernate Validator's `@Email`: it rejects the obviously malformed
// rather than trying to decide what the RFC allows.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*$/;

/**
 * Validates and builds the signup payload (`UserDataDTO`), then maps it to an `AppUser` the way
 * `modelMapper.map(user, AppUser.class)` does in the controller.
 *
 * Field errors are collected in declaration order so that the global handler's "first error wins"
 * rule picks the same one Spring would.
 */
function toAppUser(body) {
  const source = body && typeof body === 'object' ? body : {};
  const { username, email, password, appUserRoles } = source;
  const fieldErrors = [];

  if (isBlank(username)) {
    fieldErrors.push({ field: 'username', message: NOT_BLANK });
  } else if (username.length < 4 || username.length > 255) {
    fieldErrors.push({ field: 'username', message: 'Minimum username length: 4 characters' });
  }

  if (isBlank(email)) {
    fieldErrors.push({ field: 'email', message: NOT_BLANK });
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.push({ field: 'email', message: NOT_A_WELL_FORMED_EMAIL });
  }

  if (isBlank(password)) {
    fieldErrors.push({ field: 'password', message: NOT_BLANK });
  } else if (password.length < 8) {
    fieldErrors.push({ field: 'password', message: 'Minimum password length: 8 characters' });
  }

  if (appUserRoles !== undefined && appUserRoles !== null) {
    if (!Array.isArray(appUserRoles) || !appUserRoles.every(isAppUserRole)) {
      fieldErrors.push({ field: 'appUserRoles', message: 'must contain only known roles' });
    }
  }

  if (fieldErrors.length > 0) {
    throw new MethodArgumentNotValidException(fieldErrors);
  }

  return new AppUser({
    username,
    email,
    password,
    appUserRoles: appUserRoles === undefined || appUserRoles === null ? [] : appUserRoles,
  });
}

/** Validates the body of the refresh and logout requests (`RefreshRequestDTO`). */
function toRefreshToken(body) {
  const source = body && typeof body === 'object' ? body : {};
  const { refreshToken } = source;

  if (isBlank(refreshToken)) {
    throw new MethodArgumentNotValidException([{ field: 'refreshToken', message: NOT_BLANK }]);
  }

  return refreshToken;
}

/** The user projection returned to clients, i.e. `modelMapper.map(appUser, UserResponseDTO.class)`. */
function toUserResponseDTO(appUser) {
  return {
    id: appUser.id,
    username: appUser.username,
    email: appUser.email,
    appUserRoles: appUser.appUserRoles || [],
  };
}

module.exports = { AuthResponseDTO, toAppUser, toRefreshToken, toUserResponseDTO };
