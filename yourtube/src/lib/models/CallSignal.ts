import mongoose, { Schema, Document } from "mongoose";

export interface ICallSignal extends Document {
  roomId: string;
  fromPeerId: string;
  toPeerId: string;
  type: string;
  data: any;
  delivered: boolean;
  createdAt: Date;
}

const CallSignalSchema = new Schema<ICallSignal>(
  {
    roomId: { type: String, required: true, index: true },
    fromPeerId: { type: String, required: true },
    toPeerId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-delete delivered/old signals after 3 minutes
CallSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 });

export default mongoose.models.CallSignal || mongoose.model<ICallSignal>("CallSignal", CallSignalSchema);
