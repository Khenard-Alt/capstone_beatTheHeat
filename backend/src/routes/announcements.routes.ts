import { Router } from 'express';
import announcementsController from '../controllers/announcementsController';
import express from 'express';

const router = Router();

// GET /api/announcements
router.get('/', announcementsController.getAnnouncements);
// POST /api/announcements
router.post('/', express.json(), announcementsController.createAnnouncement);

export default router;
