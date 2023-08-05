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

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, UserRepository],
  imports: [
    MongooseModule.forFeature([{ name: Orders.name, schema: OrderSchema }]),
    MongooseModule.forFeature([{ name: Users.name, schema: UserSchema }]),
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
