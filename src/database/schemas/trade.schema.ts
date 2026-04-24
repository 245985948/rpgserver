/**
 * 交易数据Schema定义
 * 对应坊市与天道经济模块
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CurrencyType, TradeType } from '../../shared/enums';

export type TradeDocument = Trade & Document;

/**
 * 交易主文档
 */
@Schema({
  timestamps: true,
  collection: 'trades',
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Trade {
  @Prop({ type: Types.ObjectId, ref: 'Player', index: true })
  sellerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Player', index: true })
  buyerId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  itemId: string;

  @Prop({ type: Number, default: 1 })
  itemCount: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, enum: CurrencyType, default: CurrencyType.SPIRIT_STONE })
  currencyType: CurrencyType;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: String, enum: TradeType, default: TradeType.MARKET })
  tradeType: TradeType;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  // 风控标记
  @Prop({ type: Boolean, default: false })
  isFlagged: boolean;

  @Prop({ type: String })
  flagReason?: string;

  // 时间戳 (由 timestamps: true 自动管理)
  createdAt?: Date;
  updatedAt?: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);

// 索引
TradeSchema.index({ sellerId: 1, createdAt: -1 });
TradeSchema.index({ buyerId: 1, createdAt: -1 });
TradeSchema.index({ itemId: 1, isCompleted: 1, price: 1 });
TradeSchema.index({ isCompleted: 1, createdAt: -1 });
