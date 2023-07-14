import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from 'config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  app.setGlobalPrefix(config.get('appPrefix'));

  await app.listen(config.get('port'), () => {
    return console.log(`Server is running on port ${config.get('port')}`);
  });
}
bootstrap();
