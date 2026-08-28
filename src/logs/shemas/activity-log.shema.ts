import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { LogUser } from '../interfaces/log-user.interface';

export type ActivityLogDocument = ActivityLog & Document;

export enum LogType {
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  RESERVATION_ARRIVED = 'reservation_arrived',
  RESERVATION_DONE = 'reservation_done',
  USER_UPDATED = 'user_updated',
  USER_REGISTERED = 'user_registered',
  OCCUPANCY_CHECKED = 'occupancy_checked',
}
@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, enum: LogType })
  type!: LogType;

  @Prop({ required: true, type: Object })
  user!: LogUser;

  @Prop({ type: Object })
  details!: Record<string, any>;

  @Prop()
  createdAt!: Date;
}
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
