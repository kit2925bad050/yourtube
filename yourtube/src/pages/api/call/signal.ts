import type { NextApiRequest, NextApiResponse } from "next";
import connectDB from "@/lib/db";
import CallRoom from "@/lib/models/CallRoom";
import CallSignal from "@/lib/models/CallSignal";

interface MemoryPeer {
  peerId: string;
  userName: string;
  joinedAt: Date;
  lastSeen: Date;
}

interface MemorySignal {
  id: string;
  roomId: string;
  fromPeerId: string;
  toPeerId: string;
  type: string;
  data: any;
  createdAt: number;
}

// Global in-memory fallback for local dev when MongoDB is not connected
const memoryRooms = (global as any).__MEM_CALL_ROOMS__ || new Map<string, Map<string, MemoryPeer>>();
const memorySignals = (global as any).__MEM_CALL_SIGNALS__ || new Map<string, MemorySignal[]>();
(global as any).__MEM_CALL_ROOMS__ = memoryRooms;
(global as any).__MEM_CALL_SIGNALS__ = memorySignals;

const INACTIVITY_THRESHOLD_MS = 45 * 1000; // 45 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let isDbConnected = false;
  try {
    await connectDB();
    isDbConnected = true;
  } catch (err) {
    isDbConnected = false;
  }

  // -------------------------------------------------------------
  // POST: join, leave, send-signal
  // -------------------------------------------------------------
  if (req.method === "POST") {
    const { action, roomId, peerId, userName, toPeerId, type, data } = req.body || {};

    if (!roomId || !peerId) {
      return res.status(400).json({ error: "roomId and peerId are required" });
    }

    const cleanRoom = String(roomId).trim();
    const cleanPeer = String(peerId).trim();
    const cleanName = userName ? String(userName).trim() : "Anonymous";
    const now = new Date();
    const thresholdTime = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);

    // ACTION: JOIN
    if (action === "join") {
      if (isDbConnected) {
        try {
          let room = await CallRoom.findOne({ roomId: cleanRoom });
          if (!room) {
            room = new CallRoom({ roomId: cleanRoom, peers: [] });
          }

          // Filter out stale peers
          const activePeers = (room.peers || []).filter(
            (p: any) => p.lastSeen && new Date(p.lastSeen) > thresholdTime
          );

          // 2-person limit check
          const isExisting = activePeers.some((p: any) => p.peerId === cleanPeer);
          if (!isExisting && activePeers.length >= 2) {
            return res.status(403).json({
              error: "Room is full. Maximum 2 participants are allowed.",
              code: "ROOM_FULL",
            });
          }

          // Update or insert current peer
          const otherPeers = activePeers.filter((p: any) => p.peerId !== cleanPeer);
          const updatedPeers = [
            ...otherPeers,
            { peerId: cleanPeer, userName: cleanName, joinedAt: now, lastSeen: now },
          ];

          room.peers = updatedPeers;
          await room.save();

          // Notify other existing active peer that a new user joined
          for (const other of otherPeers) {
            await CallSignal.create({
              roomId: cleanRoom,
              fromPeerId: cleanPeer,
              toPeerId: other.peerId,
              type: "user-joined",
              data: { peerId: cleanPeer, userName: cleanName },
            });
          }

          return res.status(200).json({
            success: true,
            joined: true,
            roomId: cleanRoom,
            peerId: cleanPeer,
            existingPeers: otherPeers.map((p: any) => ({
              peerId: p.peerId,
              userName: p.userName,
            })),
          });
        } catch (dbErr: any) {
          console.error("DB join error:", dbErr);
        }
      }

      // In-Memory Fallback
      if (!memoryRooms.has(cleanRoom)) {
        memoryRooms.set(cleanRoom, new Map<string, MemoryPeer>());
      }
      const roomMap = memoryRooms.get(cleanRoom)!;
      const activeMemPeers: MemoryPeer[] = [];
      for (const [pid, p] of roomMap.entries()) {
        if (Date.now() - new Date(p.lastSeen).getTime() <= INACTIVITY_THRESHOLD_MS) {
          activeMemPeers.push(p);
        } else {
          roomMap.delete(pid);
        }
      }

      const isMemExisting = activeMemPeers.some((p) => p.peerId === cleanPeer);
      if (!isMemExisting && activeMemPeers.length >= 2) {
        return res.status(403).json({
          error: "Room is full. Maximum 2 participants are allowed.",
          code: "ROOM_FULL",
        });
      }

      roomMap.set(cleanPeer, {
        peerId: cleanPeer,
        userName: cleanName,
        joinedAt: now,
        lastSeen: now,
      });

      const otherMemPeers = activeMemPeers.filter((p) => p.peerId !== cleanPeer);
      for (const other of otherMemPeers) {
        const inbox = `${cleanRoom}:${other.peerId}`;
        if (!memorySignals.has(inbox)) memorySignals.set(inbox, []);
        memorySignals.get(inbox)!.push({
          id: Math.random().toString(36).substring(2),
          roomId: cleanRoom,
          fromPeerId: cleanPeer,
          toPeerId: other.peerId,
          type: "user-joined",
          data: { peerId: cleanPeer, userName: cleanName },
          createdAt: Date.now(),
        });
      }

      return res.status(200).json({
        success: true,
        joined: true,
        roomId: cleanRoom,
        peerId: cleanPeer,
        existingPeers: otherMemPeers.map((p) => ({
          peerId: p.peerId,
          userName: p.userName,
        })),
      });
    }

    // ACTION: LEAVE
    if (action === "leave") {
      if (isDbConnected) {
        try {
          const room = await CallRoom.findOne({ roomId: cleanRoom });
          if (room) {
            const otherPeers = (room.peers || []).filter((p: any) => p.peerId !== cleanPeer);
            room.peers = otherPeers;
            await room.save();

            for (const other of otherPeers) {
              await CallSignal.create({
                roomId: cleanRoom,
                fromPeerId: cleanPeer,
                toPeerId: other.peerId,
                type: "call-ended",
                data: { peerId: cleanPeer },
              });
            }
          }
        } catch (dbErr) {
          console.error("DB leave error:", dbErr);
        }
      }

      if (memoryRooms.has(cleanRoom)) {
        const roomMap = memoryRooms.get(cleanRoom)!;
        roomMap.delete(cleanPeer);
        for (const [pid] of roomMap.entries()) {
          const inbox = `${cleanRoom}:${pid}`;
          if (!memorySignals.has(inbox)) memorySignals.set(inbox, []);
          memorySignals.get(inbox)!.push({
            id: Math.random().toString(36).substring(2),
            roomId: cleanRoom,
            fromPeerId: cleanPeer,
            toPeerId: pid,
            type: "call-ended",
            data: { peerId: cleanPeer },
            createdAt: Date.now(),
          });
        }
      }

      return res.status(200).json({ success: true, left: true });
    }

    // ACTION: SEND-SIGNAL (offer, answer, candidate)
    if (action === "send-signal") {
      if (!toPeerId) {
        return res.status(400).json({ error: "toPeerId is required for send-signal" });
      }
      const cleanTo = String(toPeerId).trim();

      if (isDbConnected) {
        try {
          await CallSignal.create({
            roomId: cleanRoom,
            fromPeerId: cleanPeer,
            toPeerId: cleanTo,
            type: type || "candidate",
            data,
          });
          return res.status(200).json({ success: true, sent: true });
        } catch (dbErr) {
          console.error("DB signal send error:", dbErr);
        }
      }

      const inbox = `${cleanRoom}:${cleanTo}`;
      if (!memorySignals.has(inbox)) memorySignals.set(inbox, []);
      memorySignals.get(inbox)!.push({
        id: Math.random().toString(36).substring(2),
        roomId: cleanRoom,
        fromPeerId: cleanPeer,
        toPeerId: cleanTo,
        type: type || "candidate",
        data,
        createdAt: Date.now(),
      });

      return res.status(200).json({ success: true, sent: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  }

  // -------------------------------------------------------------
  // GET: poll signals and send heartbeat
  // -------------------------------------------------------------
  if (req.method === "GET") {
    const { roomId, peerId } = req.query;
    if (!roomId || !peerId) {
      return res.status(400).json({ error: "roomId and peerId query parameters required" });
    }

    const cleanRoom = String(roomId).trim();
    const cleanPeer = String(peerId).trim();
    const now = new Date();

    if (isDbConnected) {
      try {
        // 1. Heartbeat update
        await CallRoom.updateOne(
          { roomId: cleanRoom, "peers.peerId": cleanPeer },
          { $set: { "peers.$.lastSeen": now } }
        );

        // 2. Fetch all signals addressed to this peer
        const signals = await CallSignal.find({
          roomId: cleanRoom,
          toPeerId: cleanPeer,
        }).sort({ createdAt: 1 });

        if (signals.length > 0) {
          const ids = signals.map((s: any) => s._id);
          // Delete retrieved signals
          await CallSignal.deleteMany({ _id: { $in: ids } });
        }

        return res.status(200).json({
          success: true,
          messages: signals.map((s: any) => ({
            id: s._id.toString(),
            fromPeerId: s.fromPeerId,
            toPeerId: s.toPeerId,
            type: s.type,
            data: s.data,
            timestamp: new Date(s.createdAt).getTime(),
          })),
        });
      } catch (dbErr) {
        console.error("DB poll error:", dbErr);
      }
    }

    // In-Memory Fallback
    if (memoryRooms.has(cleanRoom)) {
      const roomMap = memoryRooms.get(cleanRoom)!;
      if (roomMap.has(cleanPeer)) {
        const p = roomMap.get(cleanPeer)!;
        p.lastSeen = now;
      }
    }

    const inbox = `${cleanRoom}:${cleanPeer}`;
    const messages: MemorySignal[] = memorySignals.get(inbox) || [];
    memorySignals.set(inbox, []);

    return res.status(200).json({
      success: true,
      messages: messages.map((m: MemorySignal) => ({
        id: m.id,
        fromPeerId: m.fromPeerId,
        toPeerId: m.toPeerId,
        type: m.type,
        data: m.data,
        timestamp: m.createdAt,
      })),
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
