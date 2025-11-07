import { Router, Request, Response, NextFunction } from 'express';
import { badRequest, isValidISODate, toPositiveInt, isValidObjectId } from '../lib/validate';
import {
  listAppointments,
  createAppointment,
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from '../repos/appointmentsRepo';

const router = Router();

// List with basic filters: date (YYYY-MM-DD or ISO), customerId, status
router.get('/', async (req: Request, res: Response) => {
  const { date, customerId, status } = req.query as Record<string, string | undefined>;
  const data = await listAppointments({ dateStartsWith: date, customerId, status: status as any });
  res.json({ data });
});

// Create
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, date, durationMinutes, customerId, notes, status } = req.body ?? {};
    if (!title || typeof title !== 'string') throw badRequest('title is required');
    if (!isValidISODate(date)) throw badRequest('date must be ISO 8601');
    const dMin = toPositiveInt(durationMinutes);
    if (!dMin) throw badRequest('durationMinutes must be a positive integer');
    if (!customerId || typeof customerId !== 'string') throw badRequest('customerId is required');

    const appt = await createAppointment({ title, date, durationMinutes: dMin, customerId, notes, status });
    res.status(201).json({ data: appt });
  } catch (e) {
    next(e);
  }
});

// Read
router.get('/:id', async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const appt = await getAppointment(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  return res.json({ data: appt });
});

// Update (partial)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidObjectId(req.params.id)) throw badRequest('Invalid id');
    const updates: any = { ...req.body };
    if (updates.date && !isValidISODate(updates.date)) throw badRequest('date must be ISO 8601');
    if (updates.durationMinutes !== undefined) {
      const dMin = toPositiveInt(updates.durationMinutes);
      if (!dMin) throw badRequest('durationMinutes must be a positive integer');
      updates.durationMinutes = dMin;
    }
    const appt = await updateAppointment(req.params.id, updates);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ data: appt });
  } catch (e) {
    next(e);
  }
});

// Delete
router.delete('/:id', async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const ok = await deleteAppointment(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Appointment not found' });
  return res.status(204).end();
});

export { router };
