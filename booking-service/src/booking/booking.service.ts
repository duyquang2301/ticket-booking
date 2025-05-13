import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
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
    private decrementTicketsScript: string;

    constructor(
        @InjectModel(Booking.name) private bookingModel: Model<Booking>,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
        private readonly httpService: HttpService,
        private readonly rabbitMQProducer: RabbitMQProducer,
    ) {
        // Load Lua script to decrement tickets in Redis
        this.decrementTicketsScript = fs.readFileSync(join(__dirname, 'redis', 'decrement-tickets.lua'), 'utf8');
        this.redisClient.defineCommand('decrementTickets', {
            numberOfKeys: 1,
            lua: this.decrementTicketsScript,
        });
    }

    // Create a new booking
    async create(createBookingDto: CreateBookingDto, userId: string) {
        // Step 1: Check if the user has already booked the same concert
        const existingBooking = await this.checkExistingBooking(userId, createBookingDto.concertId);
        if (existingBooking && existingBooking.status === 'confirmed') {
            throw new BadRequestException('You have already booked a ticket for this concert');
        }

        // Step 2: Get concert details from the concert service
        const concert = await this.getConcertDetails(createBookingDto.concertId);

        // Step 3: Get the seatType details from concert
        const seatType = this.getSeatTypeFromConcert(concert, createBookingDto.seatTypeId);

        // Step 4: Update remaining tickets in Redis
        const newRemainingTickets = await this.updateTicketsInRedis(seatType, createBookingDto.quantity);

        // Step 5: Send seat type update via RabbitMQ
        await this.rabbitMQProducer.sendSeatTypeUpdate(createBookingDto.seatTypeId, newRemainingTickets);

        // Step 6: Create a new booking and save to database
        if (existingBooking && existingBooking.status !== 'confirmed') {
            return this.updateBooking(existingBooking, createBookingDto)
        }
        return this.createBooking(createBookingDto, userId);
    }

    // Check if the user has already booked the same concert
    private async checkExistingBooking(userId: string, concertId: string) {
        return await this.bookingModel.findOne({ userId, concertId });
    }

    // Get concert details from the concert service
    private async getConcertDetails(concertId: string) {
        const concertResponse = await firstValueFrom(
            this.httpService.get(`http://concert-service:3001/concerts/${concertId}`),
        );

        const concert = concertResponse.data;

        if (!concert || concert.status !== 'active') {
            throw new BadRequestException('Concert not available');
        }

        return concert;
    }

    // Get seat type details from the concert
    private getSeatTypeFromConcert(concert: any, seatTypeId: string) {
        const seatType = concert.seatTypeIds.find(st => st._id === seatTypeId);
        if (!seatType) {
            throw new BadRequestException('Seat type not found');
        }
        return seatType;
    }

    // Update the number of remaining tickets in Redis
    private async updateTicketsInRedis(seatType: any, quantity: number) {
        const redisKey = `seatType:${seatType._id}`;
        const redisTickets = await this.redisClient.get(redisKey);

        if (redisTickets === null) {
            await this.redisClient.set(redisKey, seatType.remainingTickets);
        }

        const newRemainingTickets = await (this.redisClient as any).decrementTickets(
            redisKey,
            quantity,
            seatType.totalTickets,
        );

        if (newRemainingTickets < 0) {
            throw new BadRequestException('Not enough tickets available');
        }

        return newRemainingTickets;
    }

    // Create a new booking and save it to the database
    private async createBooking(createBookingDto: CreateBookingDto, userId: string) {
        const booking = new this.bookingModel({
            userId,
            concertId: createBookingDto.concertId,
            seatTypeId: createBookingDto.seatTypeId,
            quantity: createBookingDto.quantity,
            status: 'confirmed',
        });
        return await booking.save();
    }

    private async updateBooking(existingBooking: Booking, createBookingDto: CreateBookingDto) {
        existingBooking.quantity = createBookingDto.quantity;
        existingBooking.status = 'confirmed';  // Update status to confirmed
        await existingBooking.save();

        return existingBooking;
    }

    // Cancel a booking
    async cancelBooking(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId.toString() !== userId) {
            throw new ForbiddenException('Unauthorized to cancel this booking');
        }

        if (booking.status !== 'confirmed') {
            throw new BadRequestException('This booking has already been cancelled');
        }

        // Cancel the booking
        booking.status = 'cancelled';
        await booking.save();

        // Update ticket count in Redis
        const redisKey = `seatType:${booking.seatTypeId}`;
        const currentRedisTickets = await this.redisClient.get(redisKey);
        if (currentRedisTickets === null) {
            throw new BadRequestException('Seat type not initialized in Redis');
        }

        const newRemainingTickets = parseInt(currentRedisTickets) + booking.quantity;
        await this.redisClient.set(redisKey, newRemainingTickets);

        // Send seat type update via RabbitMQ
        await this.rabbitMQProducer.sendSeatTypeUpdate(booking.seatTypeId.toString(), newRemainingTickets);

        return { message: 'Booking has been cancelled successfully' };
    }
}
