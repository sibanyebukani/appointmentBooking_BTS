import { MongoClient, Db, Collection, ObjectId, ServerApiVersion, Document } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'appointments';
  if (!uri) throw new Error('MONGODB_URI is not set');
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  db = client.db(dbName);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not initialized. Call connectMongo() first.');
  return db;
}

export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export { ObjectId };
