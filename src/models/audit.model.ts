import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    ipAddress: String,
    userAgent: String,
    metadata: Schema.Types.Mixed
  },
  { 
    timestamps: { createdAt: true, updatedAt: false } // Only createdAt
  }
);

// If using MongoDB 5.0+, we can treat this as a time-series
// For Mongoose, we simply define the model. 
// You might manually create the collection as time-series in Atlas.

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
