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

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    MongooseModule.forFeature([{ name: Orders.name, schema: OrderSchema }]),
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
