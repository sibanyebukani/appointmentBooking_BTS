const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient, ServerApiVersion } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'appointments';

  console.log('Testing MongoDB connection...');
  console.log('Database:', dbName);

  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env file');
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB successfully');

    const result = await client.db(dbName).command({ ping: 1 });
    console.log('✓ Ping successful:', result);

    // List collections
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('✓ Available collections:', collections.map(c => c.name).join(', ') || '(none)');

    return true;
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testConnection().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
