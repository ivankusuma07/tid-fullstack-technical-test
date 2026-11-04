import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Work Order System API')
    .setDescription('Pick a seeded user (GET /api/users) and send its id as the X-User-Id header.')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-User-Id', in: 'header' }, 'actor')
    .addSecurityRequirements('actor')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API on http://localhost:${port}/api (docs at /api/docs)`, 'Bootstrap');
}
void bootstrap();
