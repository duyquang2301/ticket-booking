import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConcertsService } from './concert.service';
import { ConcertsController } from './concert.controller';
import { Concert, ConcertSchema, SeatType, SeatTypeSchema } from './model/concerts.schema';
import { RabbitMQConsumer } from './rabbitmq/rabbitmq.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Concert.name, schema: ConcertSchema },
      { name: SeatType.name, schema: SeatTypeSchema },
    ]),
  ],
  providers: [ConcertsService, RabbitMQConsumer],
  controllers: [ConcertsController],
})
export class ConcertsModule {}
