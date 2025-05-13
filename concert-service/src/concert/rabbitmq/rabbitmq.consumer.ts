import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
    private rabbitmqConnection: amqp.Connection;
    private rabbitmqChannel: amqp.Channel;
    private readonly rabbitmqUrl = process.env.QUEUE_URL || 'amqp://guest:guest@rabbitmq:5672';
    private messageHandler: (seatTypeId: string, remainingTickets: number) => Promise<void>;

    constructor() { }

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

            console.log('RabbitMQ consumer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RabbitMQ consumer:', error.message);
            throw new Error('RabbitMQ consumer initialization failed');
        }
    }

    setMessageHandler(handler: (seatTypeId: string, remainingTickets: number) => Promise<void>) {
        this.messageHandler = handler;
        this.startConsuming();
    }

    private async startConsuming() {
        this.rabbitmqChannel.consume('seatTypeUpdates', async (msg) => {
            if (msg) {
                try {
                    const { seatTypeId, remainingTickets } = JSON.parse(msg.content.toString());
                    await this.messageHandler(seatTypeId, remainingTickets);
                    this.rabbitmqChannel.ack(msg);
                    console.log(`Processed seatType update: ${seatTypeId} with remainingTickets: ${remainingTickets}`);
                } catch (error) {
                    console.error('Error processing RabbitMQ message:', error.message);
                }
            }
        }, { noAck: false });
    }

    async close() {
        await this.rabbitmqChannel.close();
        await this.rabbitmqConnection.close();
    }
}
