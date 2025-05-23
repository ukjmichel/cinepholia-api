import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'Documentation of My API',
    },
  },
  apis: [
    path.join(process.cwd(), 'src', 'routes', '**', '*'),
    path.join(process.cwd(), 'src', 'routes', '**', '*'),
    path.join(process.cwd(), 'dist', 'routes', '**', '*'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  console.log('📣 setupSwagger() has been called'); // ✅ Debug log

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('✅ Swagger UI available at /api-docs');
  console.log('✅ Swagger JSON available at /swagger.json');
}
