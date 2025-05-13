import { Controller, Post, Body, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { BookingsService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from './auth/jwt-auth.guard';


@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
        return this.bookingsService.create(createBookingDto, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async cancel(@Param('id') id: string, @Request() req) {
        return this.bookingsService.cancelBooking(id, req.user.userId);
    }
}
