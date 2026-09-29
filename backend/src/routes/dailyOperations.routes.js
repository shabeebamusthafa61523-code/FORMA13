import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
  getDailyOperations,
  toggleRoutineStatus,
  addRoutineItem,
  saveDepartmentBriefing,
  submitEodClosure
} from '../controllers/dailyOperations.controller.js';

const router = Router();

// Apply auth middleware
router.use(verifyToken);

router.get('/', getDailyOperations);
router.patch('/routine/:routineId/toggle', toggleRoutineStatus);
router.post('/routine', addRoutineItem);
router.post('/briefing', saveDepartmentBriefing);
router.post('/eod', submitEodClosure);

export default router;
