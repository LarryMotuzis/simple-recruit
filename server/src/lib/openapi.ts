import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Simple Recruit API',
      version: '1.0.0',
      description:
        'Recruiting pipeline and player-development tracker API. Most routes require a ' +
        "Bearer access token obtained from POST /auth/login. POST /auth/refresh instead " +
        'relies on the httpOnly refresh_token cookie set by /auth/login.',
    },
    servers: [{ url: '/' }],
  });
}
