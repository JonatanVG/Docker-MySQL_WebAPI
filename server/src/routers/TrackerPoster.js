import { Router } from 'express';
import controller from '../controllers/con-Ppos.js';

const router = Router();

router.post('/tracker', controller.post_pos);
router.get('/tracker/pos/:posID', controller.pos_get);
router.get('/tracker/tour/:tourID', controller.tour_get);
router.get('/tracker', controller.all_get);

export default router;