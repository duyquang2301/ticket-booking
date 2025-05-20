import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

type MessageHandler = (seatTypeId: string, remainingTickets: number) => Promise<void>;

@Injectable()
export class RabbitMQConsumer implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private readonly queueUrl = process.env.QUEUE_URL || 'amqp://guest:guest@rabbitmq:5672';
  private readonly exchange = 'seatType_exchange';
  private readonly queue = 'seatTypeUpdates';
  private readonly routingKey = '';
  private messageHandler: MessageHandler;

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.queueUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchange, 'fanout', { durable: true });
      await this.channel.assertQueue(this.queue, { durable: true });
      await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);

      this.logger.log('✅ RabbitMQ consumer connected and ready.');
    } catch (error) {
      this.logger.error('❌ Failed to initialize RabbitMQ consumer', error.stack);
      throw new Error('RabbitMQ consumer initialization failed');
    }
  }

  public registerHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
    this.consumeMessages();
  }

  private async consumeMessages(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel is not initialized. Cannot consume messages.');
      return;
    }

    await this.channel.consume(
      this.queue,
      async (msg) => {
        if (!msg) return;

        try {
          const { seatTypeId, remainingTickets } = JSON.parse(msg.content.toString());
          await this.messageHandler?.(seatTypeId, remainingTickets);
          this.channel.ack(msg);

          this.logger.debug(`📥 Consumed message: seatTypeId=${seatTypeId}, remainingTickets=${remainingTickets}`);
        } catch (err) {
          this.logger.error('❌ Failed to process message', err.stack);
          // Optional: move to dead-letter queue
        }
      },
      { noAck: false },
    );
  }

  private async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('🛑 RabbitMQ consumer closed.');
    } catch (err) {
      this.logger.warn('Error while closing RabbitMQ consumer:', err.message);
    }
  }
}
