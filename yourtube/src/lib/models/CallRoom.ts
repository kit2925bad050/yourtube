import mongoose, { Schema, Document } from "mongoose";

export interface ICallRoom extends Document {
  roomId: string;
  peers: Array<{
    peerId: string;
    userName: string;
    joinedAt: Date;
    lastSeen: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CallRoomSchema = new Schema<ICallRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    peers: [
      {
        peerId: { type: String, required: true },
        userName: { type: String, default: "Anonymous" },
        joinedAt: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Auto-delete inactive rooms after 15 minutes
CallRoomSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 900 });

export default mongoose.models.CallRoom || mongoose.model<ICallRoom>("CallRoom", CallRoomSchema);
