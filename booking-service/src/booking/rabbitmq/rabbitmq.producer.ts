import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQProducer implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  private readonly url = process.env.QUEUE_URL || 'amqp://guest:guest@rabbitmq:5672';
  private readonly exchange = 'seatType_exchange';
  private readonly queue = 'seatTypeUpdates';
  private readonly logger = new Logger(RabbitMQProducer.name);

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, 'fanout', { durable: true });
      await this.channel.assertQueue(this.queue, { durable: true });
      await this.channel.bindQueue(this.queue, this.exchange, '');

      this.logger.log('RabbitMQ Producer initialized');
    } catch (error) {
      this.logger.error('RabbitMQ connection failed', error.stack);
      throw new Error('Failed to initialize RabbitMQ producer');
    }
  }

  async sendSeatTypeUpdate(seatTypeId: string, remainingTickets: number): Promise<void> {
    const message = JSON.stringify({ seatTypeId, remainingTickets });

    try {
      this.channel.publish(this.exchange, '', Buffer.from(message), { persistent: true });
      this.logger.log(`Sent update: ${message}`);
    } catch (error) {
      this.logger.error('Failed to publish message', error.stack);
      throw new Error('Failed to send message to RabbitMQ');
    }
  }

  private async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ Producer closed');
    } catch (error) {
      this.logger.warn('Error during closing RabbitMQ connection', error.stack);
    }
  }
}
