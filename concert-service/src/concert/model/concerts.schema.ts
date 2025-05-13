import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class SeatType extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Concert', required: true })
  concertId: Types.ObjectId;

  @Prop({ required: true })
  type: string; // e.g., VIP, Regular, Standing

  @Prop({ required: true })
  totalTickets: number;

  @Prop({ required: true })
  remainingTickets: number;
}

@Schema()
export class Concert extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SeatType' }] })
  seatTypeIds: Types.ObjectId[];
}

export const ConcertSchema = SchemaFactory.createForClass(Concert);
export const SeatTypeSchema = SchemaFactory.createForClass(SeatType);
