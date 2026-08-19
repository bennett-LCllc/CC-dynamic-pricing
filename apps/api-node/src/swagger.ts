import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

const specPath = path.resolve(__dirname, '../openapi.yaml');

// Parse the YAML file into a JavaScript object
let openapiSpec: Record<string, any>;
try {
  const yamlContent = fs.readFileSync(specPath, 'utf8');
  const parsedYaml = yaml.load(yamlContent);
  openapiSpec = parsedYaml as Record<string, any>;
} catch (e) {
  console.error('Failed to load OpenAPI spec:', e);
  process.exit(1);
}

/**
 * Installs the Swagger UI route.
 * Visiting `/api-docs` in the browser will render the interactive docs.
 */
export function setupSwagger(app: any): void {
  app.use('/api-docs', swaggerUi.serve);
  app.use('/api-docs', swaggerUi.setup(openapiSpec, { swaggerUrl: '/api-docs' }));
}
