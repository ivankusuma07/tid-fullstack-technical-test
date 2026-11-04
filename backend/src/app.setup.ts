import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

/** Global HTTP setup, shared by main.ts and the e2e tests so both run the same app. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}
