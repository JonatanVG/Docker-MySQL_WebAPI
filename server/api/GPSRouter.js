// weatherApi.js (Express backend)
import { Router } from 'express';
const router = Router();
import controller from './GPSControllers/gpsPos.js';

router.get('/gps/pos/:posID', controller.pos_get);
router.get('/gps/pos', controller.all_get);
router.get('/gps/:tourID', controller.tour_get);
router.get('/gps', controller.all_get);

// In Express - test route
router.get('/debug/gps/:posID', (req, res) => {
	res.json({
		debug: true,
		posID: req.params.posID,
		environment: process.env.NODE_ENV,
		timestamp: new Date().toISOString()
	});
});

// Gå til /api/v1/test for å se om api-et funker uten å bruker weather apiet.
router.get('/test', (req, res) => {
	res.json({ 
		message: 'Express API is working',
		timestamp: new Date().toISOString() 
	});
});

export default router;