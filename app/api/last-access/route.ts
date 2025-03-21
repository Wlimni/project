// app/api/last-access/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

let cached = (global as any).mongoose || { conn: null, promise: null };
if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const RecordSchema = new mongoose.Schema({
  subjectId: { type: String, required: true },
  heartRate: { bpm: Number, confidence: Number },
  hrv: { sdnn: Number, confidence: Number },
  ppgData: [Number],
  timestamp: { type: Date, default: Date.now },
});

const Record = mongoose.models.Record || mongoose.model("Record", RecordSchema);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");

  if (!subjectId) {
    return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    const records = await Record.find({ subjectId });

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "No data found for this subject" },
        { status: 404 }
      );
    }

    const avgHeartRate =
      records.reduce((sum, rec) => sum + rec.heartRate.bpm, 0) / records.length;
    const avgHRV =
      records.reduce((sum, rec) => sum + rec.hrv.sdnn, 0) / records.length;
    const lastAccess = records.sort((a, b) => b.timestamp - a.timestamp)[0].timestamp;

    return NextResponse.json({
      avgHeartRate: avgHeartRate.toFixed(2),
      avgHRV: avgHRV.toFixed(2),
      lastAccess,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}