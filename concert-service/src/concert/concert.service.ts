import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Concert, SeatType } from './model/concerts.schema';
import { RabbitMQConsumer } from './rabbitmq/rabbitmq.consumer';

@Injectable()
export class ConcertsService {
    constructor(
        @InjectModel(Concert.name) private concertModel: Model<Concert>,
        @InjectModel(SeatType.name) private seatTypeModel: Model<SeatType>,
        private readonly rabbitMQConsumer: RabbitMQConsumer,
    ) { }

    async findAll() {
        return this.concertModel.find().populate('seatTypeIds').exec();
    }

    async findOne(id: string) {
        const concert = await this.concertModel.findById(id).populate('seatTypeIds').exec();
        if (!concert) {
            throw new NotFoundException('Concert not found');
        }
        return concert;
    }

    async onModuleInit() {
        this.rabbitMQConsumer.setMessageHandler(async (seatTypeId: string, remainingTickets: number) => {
            await this.updateSeatType(seatTypeId, remainingTickets);
        });
    }

    private async updateSeatType(seatTypeId: string, remainingTickets: number) {
        const result = await this.seatTypeModel
            .findByIdAndUpdate(seatTypeId, { remainingTickets }, { new: true })
            .exec();

        if (!result) {
            throw new NotFoundException(`Seat type ${seatTypeId} not found`);
        }
    }
}
