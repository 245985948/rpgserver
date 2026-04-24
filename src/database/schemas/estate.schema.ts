/**
 * 仙府数据Schema定义
 * 对应仙府基建与社交模块
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BuildingType } from '../../shared/enums';

export type EstateDocument = Estate & Document;

/**
 * 建筑子文档
 */
@Schema({ _id: false })
class Building {
  @Prop({ type: String, enum: BuildingType, required: true })
  type: BuildingType;

  @Prop({ type: Number, default: 0 })
  level: number;

  @Prop({ type: Number, default: 0 })
  buildProgress: number;

  @Prop({ type: Boolean, default: false })
  isConstructing: boolean;

  @Prop({ type: Date })
  boostEndTime?: Date;
}

/**
 * 访客记录子文档
 */
@Schema({ _id: false })
class VisitorLog {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  visitorId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  visitTime: Date;

  @Prop({ type: String, enum: ['steal', 'assist'], required: true })
  action: 'steal' | 'assist';

  @Prop({ type: String, enum: BuildingType })
  targetBuilding?: BuildingType;
}

/**
 * 仙府主文档
 */
@Schema({
  timestamps: true,
  collection: 'estates',
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Estate {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, unique: true, index: true })
  playerId: Types.ObjectId;

  @Prop({ type: [Building], default: [] })
  buildings: Building[];

  @Prop({ type: Number, default: 1 })
  spiritGatheringRate: number;

  @Prop({ type: [VisitorLog], default: [] })
  visitorLogs: VisitorLog[];

  @Prop({ type: Map, of: Date, default: {} })
  lastStealTimes: Map<string, Date>;
}

export const EstateSchema = SchemaFactory.createForClass(Estate);

// 索引
EstateSchema.index({ 'visitorLogs.visitTime': -1 });
