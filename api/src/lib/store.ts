import { nanoid } from 'nanoid';

export type Appointment = {
  id: string;
  title: string;
  date: string; // ISO 8601
  durationMinutes: number;
  customerId: string;
  notes?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
};

type CreateInput = {
  title: string;
  date: string;
  durationMinutes: number;
  customerId: string;
  notes?: string;
  status?: Appointment['status'];
};

const db = new Map<string, Appointment>();

function nowISO() {
  return new Date().toISOString();
}

export const store = {
  list(): Appointment[] {
    return Array.from(db.values());
  },
  get(id: string): Appointment | undefined {
    return db.get(id);
  },
  create(input: CreateInput): Appointment {
    const id = nanoid();
    const ts = nowISO();
    const appt: Appointment = {
      id,
      title: input.title,
      date: input.date,
      durationMinutes: input.durationMinutes,
      customerId: input.customerId,
      notes: input.notes,
      status: input.status ?? 'scheduled',
      createdAt: ts,
      updatedAt: ts,
    };
    db.set(id, appt);
    return appt;
  },
  update(id: string, updates: Partial<Omit<Appointment, 'id' | 'createdAt'>>): Appointment | undefined {
    const current = db.get(id);
    if (!current) return undefined;
    const next: Appointment = {
      ...current,
      ...updates,
      updatedAt: nowISO(),
    };
    db.set(id, next);
    return next;
  },
  remove(id: string): boolean {
    return db.delete(id);
  },
  clear(): void {
    db.clear();
  },
};

