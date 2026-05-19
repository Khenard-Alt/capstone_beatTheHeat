import { Router } from 'express';
import announcementsController from '../controllers/announcementsController';

const router = Router();

// GET /api/announcements
router.get('/', announcementsController.getAnnouncements);

export default router;
