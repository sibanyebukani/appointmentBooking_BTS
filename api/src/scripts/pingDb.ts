import 'dotenv/config';
import { connectMongo, getDb } from '../db/mongo';

async function main() {
  await connectMongo();
  const result = await getDb().command({ ping: 1 });
  // eslint-disable-next-line no-console
  console.log('MongoDB ping result:', result);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('DB ping failed', err);
  process.exit(1);
});

