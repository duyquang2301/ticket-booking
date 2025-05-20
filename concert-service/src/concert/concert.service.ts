import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Concert, SeatType } from './model/concerts.schema';
import { RabbitMQConsumer } from './rabbitmq/rabbitmq.consumer';

@Injectable()
export class ConcertsService implements OnModuleInit {
  private readonly logger = new Logger(ConcertsService.name);

  constructor(
    @InjectModel(Concert.name) private readonly concertModel: Model<Concert>,
    @InjectModel(SeatType.name) private readonly seatTypeModel: Model<SeatType>,
    private readonly rabbitMQConsumer: RabbitMQConsumer,
  ) {}

  async onModuleInit(): Promise<void> {
    this.rabbitMQConsumer.registerHandler(this.handleSeatTypeUpdate.bind(this));
    this.logger.log('🎵 ConcertsService registered RabbitMQ message handler.');
  }

  async findAll(): Promise<Concert[]> {
    return this.concertModel.find().populate('seatTypeIds').exec();
  }

  async findOne(id: string): Promise<Concert> {
    const concert = await this.concertModel.findById(id).populate('seatTypeIds').exec();
    if (!concert) {
      throw new NotFoundException(`Concert with ID ${id} not found`);
    }
    return concert;
  }

  private async handleSeatTypeUpdate(seatTypeId: string, remainingTickets: number): Promise<void> {
    try {
      const updatedSeat = await this.seatTypeModel
        .findByIdAndUpdate(seatTypeId, { remainingTickets }, { new: true })
        .exec();

      if (!updatedSeat) {
        throw new NotFoundException(`Seat type ${seatTypeId} not found`);
      }

      this.logger.debug(`✅ Updated seatType ${seatTypeId} to ${remainingTickets} tickets remaining.`);
    } catch (error) {
      this.logger.error(`❌ Error updating seatType ${seatTypeId}: ${error.message}`, error.stack);
    }
  }
}
