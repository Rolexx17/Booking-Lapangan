import express from 'express';
import fieldController from '../controllers/fieldController.js';
import authController from '../controllers/authController.js';
import bookingController from '../controllers/bookingController.js';
import socialController from '../controllers/socialController.js';

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

router.get('/fields', fieldController.getFields);
router.get('/fields/:id', fieldController.getFieldById);
router.post('/fields', fieldController.createField);

router.post('/bookings', bookingController.createBooking);
router.get('/bookings/user/:userId', bookingController.getUserBookings);

router.get('/matchmakings', socialController.getMatchmakings);
router.post('/matchmakings', socialController.createMatchmaking);

router.get('/fields/:fieldId/reviews', socialController.getReviewsByField);

export default router;