import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Products, ProductsSchema } from 'src/schema/products';
import { License, LicenseSchema } from 'src/schema/license';
import { UserSchema, Users } from 'src/schema/users';
import { UserRepository } from 'src/repositories/user.repository';
import { APP_GUARD } from '@nestjs/core';
import { RoleGuard } from 'src/shared/guards/role.guard';
import { AuthMiddleware } from 'src/shared/middlewares/auth';
import config from 'config';
import { StripeModule } from 'nestjs-stripe';

@Module({
  providers: [
    ProductsService,
    UserRepository,
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  controllers: [ProductsController],
  imports: [
    MongooseModule.forFeature([
      { name: Products.name, schema: ProductsSchema },
    ]),
    MongooseModule.forFeature([{ name: License.name, schema: LicenseSchema }]),
    MongooseModule.forFeature([{ name: Users.name, schema: UserSchema }]),
    StripeModule.forRoot({
      apiKey: config.get('stripe.secret_key'),
      apiVersion: '2022-08-01',
    }),
  ],
})
export class ProductsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        {
          path: `${config.get('appPrefix')}/products`,
          method: RequestMethod.GET,
        },
        {
          path: `${config.get('appPrefix')}/products/:id`,
          method: RequestMethod.GET,
        },
      )
      .forRoutes(ProductsController);
  }
}
