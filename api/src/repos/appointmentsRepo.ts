import { Filter, FindOptions } from 'mongodb';
import { getCollection, ObjectId } from '../db/mongo';

export type AppointmentDoc = {
  _id: ObjectId;
  title: string;
  date: string; // ISO 8601
  durationMinutes: number;
  customerId: string;
  notes?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type Appointment = Omit<AppointmentDoc, '_id'> & { id: string };

function toApi(a: AppointmentDoc): Appointment {
  const { _id, ...rest } = a;
  return { id: _id.toHexString(), ...rest };
}

function nowISO() {
  return new Date().toISOString();
}

export async function listAppointments(filters: {
  dateStartsWith?: string;
  customerId?: string;
  status?: AppointmentDoc['status'];
} = {}): Promise<Appointment[]> {
  const col = getCollection<AppointmentDoc>('appointments');
  const query: Filter<AppointmentDoc> = {};
  if (filters.dateStartsWith) {
    query.date = { $regex: `^${filters.dateStartsWith}` } as any;
  }
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.status) query.status = filters.status;
  const options: FindOptions<AppointmentDoc> = { sort: { date: 1 } };
  const docs = await col.find(query, options).toArray();
  return docs.map(toApi);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const col = getCollection<AppointmentDoc>('appointments');
  const _id = new ObjectId(id);
  const doc = await col.findOne({ _id });
  return doc ? toApi(doc) : null;
}

export async function createAppointment(input: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
  const col = getCollection<AppointmentDoc>('appointments');
  const ts = nowISO();
  const doc: Omit<AppointmentDoc, '_id'> = {
    ...input,
    status: input.status ?? 'scheduled',
    createdAt: ts,
    updatedAt: ts,
  } as any;
  const result = await col.insertOne(doc as AppointmentDoc);
  return { id: result.insertedId.toHexString(), ...doc };
}

export async function updateAppointment(
  id: string,
  updates: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Appointment | null> {
  const col = getCollection<AppointmentDoc>('appointments');
  const _id = new ObjectId(id);
  const $set = { ...updates, updatedAt: nowISO() };
  const res = await col.findOneAndUpdate({ _id }, { $set }, { returnDocument: 'after' });
  return res ? toApi(res) : null;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const col = getCollection<AppointmentDoc>('appointments');
  const _id = new ObjectId(id);
  const res = await col.deleteOne({ _id });
  return res.deletedCount === 1;
}

