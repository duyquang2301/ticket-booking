import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQProducer implements OnModuleInit {
    private rabbitmqConnection: amqp.Connection;
    private rabbitmqChannel: amqp.Channel;
    private readonly rabbitmqUrl = process.env.QUEUE_URL || 'amqp://guest:guest@rabbitmq:5672';

    async onModuleInit() {
        await this.initRabbitMQ();
    }

    private async initRabbitMQ() {
        try {
            this.rabbitmqConnection = await amqp.connect(this.rabbitmqUrl);
            this.rabbitmqChannel = await this.rabbitmqConnection.createChannel();
            await this.rabbitmqChannel.assertExchange('seatType_exchange', 'fanout', { durable: true });
            await this.rabbitmqChannel.assertQueue('seatTypeUpdates', { durable: true });
            await this.rabbitmqChannel.bindQueue('seatTypeUpdates', 'seatType_exchange', '');
            console.log('RabbitMQ producer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RabbitMQ producer:', error.message);
            throw new Error('RabbitMQ producer initialization failed');
        }
    }

    async sendSeatTypeUpdate(seatTypeId: string, remainingTickets: number) {
        const message = JSON.stringify({
            seatTypeId,
            remainingTickets,
        });
        try {
            this.rabbitmqChannel.publish('seatType_exchange', '', Buffer.from(message), { persistent: true });
            console.log(`Sent seatType update: ${message}`);
        } catch (error) {
            console.error('Failed to send message to RabbitMQ:', error.message);
            throw new Error('Failed to send seat type update to RabbitMQ');
        }
    }

    async close() {
        await this.rabbitmqChannel.close();
        await this.rabbitmqConnection.close();
    }
}
