import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema, Orders } from 'src/schema/orders';
import { AuthMiddleware } from 'src/shared/middlewares/auth';
import config from 'config';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSchema, Users } from 'src/schema/users';
import { ProductRepository } from 'src/repositories/product.repository';
import { OrdersRepository } from 'src/repositories/order.repository';
import { APP_GUARD } from '@nestjs/core';
import { RoleGuard } from 'src/shared/guards/role.guard';
import { License, LicenseSchema } from 'src/schema/license';
import { Products, ProductsSchema } from 'src/schema/products';
import { StripeModule } from 'nestjs-stripe';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    UserRepository,
    ProductRepository,
    OrdersRepository,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  imports: [
    MongooseModule.forFeature([{ name: Orders.name, schema: OrderSchema }]),
    MongooseModule.forFeature([{ name: Users.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: License.name, schema: LicenseSchema }]),
    MongooseModule.forFeature([
      { name: Products.name, schema: ProductsSchema },
    ]),
    StripeModule.forRoot({
      apiKey: config.get('stripe.secret_key'),
      apiVersion: '2022-08-01',
    }),
  ],
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude({
        path: `${config.get('appPrefix')}/orders/webhook`,
        method: RequestMethod.POST,
      })
      .forRoutes(OrdersController);
  }
}
