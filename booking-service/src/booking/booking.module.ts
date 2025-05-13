import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsService } from './booking.service';
import { BookingsController } from './booking.controller';
import { Booking, BookingSchema } from './booking.schema';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { RedisModule } from './redis/redis.module';
import { RabbitMQProducer } from './rabbitmq/rabbitmq.producer';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    RedisModule,
    RabbitMQProducer,
  ],
  providers: [BookingsService, JwtStrategy],
  controllers: [BookingsController],
})
export class BookingsModule { }
