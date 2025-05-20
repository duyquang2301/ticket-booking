import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import * as fs from 'fs';
import { join } from 'path';
import { REDIS_CLIENT } from './redis/redis.module';
import { RabbitMQProducer } from './rabbitmq/rabbitmq.producer';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private decrementTicketsScript: string;

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly httpService: HttpService,
    private readonly rabbitMQProducer: RabbitMQProducer,
  ) {
    // Load Lua script once for atomic decrement in Redis
    this.decrementTicketsScript = fs.readFileSync(join(__dirname, 'redis', 'decrement-tickets.lua'), 'utf8');

    this.redisClient.defineCommand('decrementTickets', {
      numberOfKeys: 1,
      lua: this.decrementTicketsScript,
    });
  }

  // Main booking creation flow
  async create(createBookingDto: CreateBookingDto, userId: string) {
    // 1. Check existing booking
    const existingBooking = await this.bookingModel.findOne({ userId, concertId: createBookingDto.concertId });

    if (existingBooking?.status === 'confirmed') {
      throw new BadRequestException('You have already booked a ticket for this concert');
    }

    // 2. Get concert and seatType info
    const concert = await this.fetchActiveConcert(createBookingDto.concertId);
    const seatType = this.findSeatType(concert, createBookingDto.seatTypeId);

    // 3. Update ticket count in Redis atomically
    const newRemainingTickets = await this.decrementTicketsInRedis(seatType._id, createBookingDto.quantity, seatType.remainingTickets);

    // 4. Publish update event to RabbitMQ
    await this.rabbitMQProducer.sendSeatTypeUpdate(seatType._id.toString(), newRemainingTickets);

    // 5. Create or update booking in DB
    if (existingBooking) {
      return this.confirmExistingBooking(existingBooking, createBookingDto.quantity);
    } else {
      return this.createNewBooking(createBookingDto, userId);
    }
  }

  // Cancel an existing booking and update Redis + RabbitMQ
  async cancelBooking(bookingId: string, userId: string) {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId.toString() !== userId) throw new ForbiddenException('Unauthorized to cancel this booking');
    if (booking.status !== 'confirmed') throw new BadRequestException('Booking is already cancelled');

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // Restore tickets in Redis
    const redisKey = `seatType:${booking.seatTypeId}`;
    const currentTickets = await this.redisClient.get(redisKey);

    if (currentTickets === null) {
      throw new BadRequestException('Seat type data not initialized in Redis');
    }

    const updatedTickets = parseInt(currentTickets, 10) + booking.quantity;
    await this.redisClient.set(redisKey, updatedTickets);

    // Notify other services via RabbitMQ
    await this.rabbitMQProducer.sendSeatTypeUpdate(booking.seatTypeId.toString(), updatedTickets);

    return { message: 'Booking cancelled successfully' };
  }

  // Private helpers ----------------------------------------------------------

  private async fetchActiveConcert(concertId: string) {
    try {
      const response = await firstValueFrom(this.httpService.get(`http://concert-service:3001/concerts/${concertId}`));
      const concert = response.data;

      if (!concert || concert.status !== 'active') {
        throw new BadRequestException('Concert is not available or inactive');
      }

      return concert;
    } catch (error) {
      this.logger.error(`Failed to fetch concert details for id=${concertId}`, error);
      throw new BadRequestException('Failed to fetch concert details');
    }
  }

  private findSeatType(concert: any, seatTypeId: string) {
    const seatType = concert.seatTypeIds.find((st) => st._id === seatTypeId);
    if (!seatType) throw new BadRequestException('Seat type not found in concert');
    return seatType;
  }

  private async decrementTicketsInRedis(seatTypeId: string, quantity: number, initialRemaining: number) {
    const redisKey = `seatType:${seatTypeId}`;

    // Initialize Redis key if missing
    const exists = await this.redisClient.exists(redisKey);
    if (!exists) {
      await this.redisClient.set(redisKey, initialRemaining);
    }

    const newRemainingTickets = await (this.redisClient as any).decrementTickets(redisKey, quantity);

    if (newRemainingTickets < 0) {
      throw new BadRequestException('Not enough tickets available');
    }

    return newRemainingTickets;
  }

  private async createNewBooking(dto: CreateBookingDto, userId: string) {
    const booking = new this.bookingModel({
      userId,
      concertId: dto.concertId,
      seatTypeId: dto.seatTypeId,
      quantity: dto.quantity,
      status: 'confirmed',
    });

    return booking.save();
  }

  private async confirmExistingBooking(existingBooking: Booking, quantity: number) {
    existingBooking.quantity = quantity;
    existingBooking.status = 'confirmed';
    return existingBooking.save();
  }
}
