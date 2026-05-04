import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Connect to MongoDB. Lazy — does NOT throw at module load if MONGODB_URI is
 * unset. Only requests that actually call this will fail, so the build and any
 * route that doesn't touch the DB (e.g. /rambam/today) still works.
 */
export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Set it in Vercel project env vars to enable database-backed routes."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => {
      console.log("MongoDB connected");
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
