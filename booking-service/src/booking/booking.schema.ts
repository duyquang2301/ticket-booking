import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  concertId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seatTypeId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, default: 'pending' })
  status: string; // pending, confirmed, cancelled
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
