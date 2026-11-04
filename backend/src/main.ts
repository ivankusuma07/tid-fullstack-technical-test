import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Work Order System API')
    .setDescription(
      'Log in with POST /api/auth/login { userId } (ids from GET /api/users), then click "Authorize" and paste the accessToken.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API on http://localhost:${port}/api (docs at /api/docs)`, 'Bootstrap');
}
void bootstrap();
