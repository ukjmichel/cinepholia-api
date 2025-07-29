import { Router } from 'express';
import {
  addDayScheduleHandler,
  initMonthHandler,
} from '../controllers/init-db.controller.js';


const router = Router();

router.post('/screenings/month', initMonthHandler);
router.post('/screenings/day', addDayScheduleHandler);

export default router;
