'use strict';

/**
 * The OpenAPI 3 description served at `/v3/api-docs` and rendered by Swagger UI.
 *
 * SpringDoc assembles this at runtime from `OpenApiConfig` plus the `@Operation`, `@ApiResponses`
 * and `@Schema` annotations scattered across the controller and DTOs. Without an annotation
 * processor to read, the same document is declared directly.
 */

const authResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      description: "Short-lived JWT to send as 'Authorization: Bearer <token>'",
    },
    refreshToken: {
      type: 'string',
      description: 'Long-lived opaque token used to obtain a new access token',
    },
    tokenType: {
      type: 'string',
      description: 'Authentication scheme the access token is used with',
      example: 'Bearer',
    },
    expiresIn: {
      type: 'integer',
      format: 'int64',
      description: 'Access token lifetime in seconds',
    },
  },
};

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', format: 'int32' },
    username: { type: 'string' },
    email: { type: 'string' },
    appUserRoles: { type: 'array', items: { $ref: '#/components/schemas/AppUserRole' } },
  },
};

const userDataSchema = {
  type: 'object',
  required: ['username', 'email', 'password'],
  properties: {
    username: { type: 'string', minLength: 4, maxLength: 255 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    appUserRoles: { type: 'array', items: { $ref: '#/components/schemas/AppUserRole' } },
  },
};

const refreshRequestSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
      description: 'The refresh token issued alongside the current access token',
    },
  },
};

const jsonBody = (schema) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const openApiDocument = {
  openapi: '3.0.1',
  info: {
    title: 'JSON Web Token Authentication API',
    description:
      'Sample JWT authentication service. Demo users: `admin` / `admin123456` and `client` / `client123456`. ' +
      'After sign-in, use **Authorize** and enter `Bearer <token>`.',
    version: '1.0.0',
    license: { name: 'MIT License', url: 'http://opensource.org/licenses/MIT' },
    contact: { email: 'mauriurraco@gmail.com' },
  },
  tags: [{ name: 'users' }],
  paths: {
    '/users/signin': {
      post: {
        tags: ['users'],
        summary: 'Authenticates user and returns an access/refresh token pair',
        parameters: [
          { name: 'username', in: 'query', required: true, description: 'Username', schema: { type: 'string' } },
          { name: 'password', in: 'query', required: true, description: 'Password', schema: { type: 'string' } },
        ],
        responses: {
          200: jsonResponse('OK', { $ref: '#/components/schemas/AuthResponseDTO' }),
          400: { description: 'Something went wrong' },
          422: { description: 'Invalid username/password supplied' },
        },
      },
    },
    '/users/signup': {
      post: {
        tags: ['users'],
        summary: 'Creates user and returns an access/refresh token pair',
        requestBody: jsonBody({ $ref: '#/components/schemas/UserDataDTO' }),
        responses: {
          200: jsonResponse('OK', { $ref: '#/components/schemas/AuthResponseDTO' }),
          400: { description: 'Something went wrong' },
          403: { description: 'Access denied' },
          422: { description: 'Username is already in use' },
        },
      },
    },
    '/users/refresh': {
      post: {
        tags: ['users'],
        summary: 'Exchanges a refresh token for a new access/refresh token pair',
        description:
          'Does not require an access token, so it works after the access token has expired. ' +
          'The presented refresh token is consumed and replaced by the one in the response.',
        requestBody: jsonBody({ $ref: '#/components/schemas/RefreshRequestDTO' }),
        responses: {
          200: jsonResponse('New token pair issued', { $ref: '#/components/schemas/AuthResponseDTO' }),
          400: { description: 'Something went wrong' },
          401: { description: 'Expired or invalid refresh token' },
          404: { description: 'User no longer exists' },
        },
      },
    },
    '/users/logout': {
      post: {
        tags: ['users'],
        summary: 'Revokes a refresh token',
        description:
          'Idempotent: unknown or already-revoked tokens also return 204. The matching ' +
          'access token stays valid until it expires.',
        requestBody: jsonBody({ $ref: '#/components/schemas/RefreshRequestDTO' }),
        responses: {
          204: { description: 'Refresh token revoked' },
          400: { description: 'Something went wrong' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['users'],
        summary: "Returns the authenticated user's data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('OK', { $ref: '#/components/schemas/UserResponseDTO' }),
          400: { description: 'Something went wrong' },
          401: { description: 'Expired or invalid JWT token' },
          403: { description: 'Access denied' },
        },
      },
    },
    '/users/{username}': {
      get: {
        tags: ['users'],
        summary: 'Returns user by username',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'username', in: 'path', required: true, description: 'Username', schema: { type: 'string' } },
        ],
        responses: {
          200: jsonResponse('OK', { $ref: '#/components/schemas/UserResponseDTO' }),
          400: { description: 'Something went wrong' },
          401: { description: 'Expired or invalid JWT token' },
          403: { description: 'Access denied' },
          404: { description: "The user doesn't exist" },
        },
      },
      delete: {
        tags: ['users'],
        summary: 'Deletes user by username',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'username', in: 'path', required: true, description: 'Username', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'OK', content: { 'text/plain': { schema: { type: 'string' } } } },
          400: { description: 'Something went wrong' },
          401: { description: 'Expired or invalid JWT token' },
          403: { description: 'Access denied' },
          404: { description: "The user doesn't exist" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      AppUserRole: { type: 'string', enum: ['ROLE_ADMIN', 'ROLE_CLIENT'] },
      AuthResponseDTO: authResponseSchema,
      UserResponseDTO: userResponseSchema,
      UserDataDTO: userDataSchema,
      RefreshRequestDTO: refreshRequestSchema,
    },
  },
};

module.exports = { openApiDocument };
