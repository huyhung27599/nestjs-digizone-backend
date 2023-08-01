import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from 'config';
import cookieParser from 'cookie-parser';
import { NextFunction, raw, Request, Response } from 'express';
import csurf from 'csurf';
import { TransformationInterceptor } from './shared/response.interceptor';

const ROOT_IGNORED_PATHS = ['/api/v1/orders/webhook'];

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  app.use('/api/v1/orders/webhook', raw({ type: '*/*' }));

  const csrfMiddleware = csurf({
    cookie: true,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (ROOT_IGNORED_PATHS.includes(req.path)) {
      return next();
    }
    return csrfMiddleware(req, res, next);
  });

  app.setGlobalPrefix(config.get('appPrefix'));
  app.useGlobalInterceptors(new TransformationInterceptor());

  await app.listen(config.get('port'), () => {
    return console.log(`Server is running on port ${config.get('port')}`);
  });
}
bootstrap();
