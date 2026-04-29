import express from 'express';
import fieldController from '../controllers/fieldController.js';
import authController from '../controllers/authController.js';
import bookingController from '../controllers/bookingController.js';
import socialController from '../controllers/socialController.js';

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

router.get('/users/:id', authController.getUserProfile);
router.put('/users/:id', authController.updateUserProfile);

router.get('/fields', fieldController.getFields);
router.get('/fields/:id', fieldController.getFieldById);
router.post('/fields', fieldController.createField);
router.put('/fields/:id', fieldController.updateField);
router.delete('/fields/:id', fieldController.deleteField);

router.post('/bookings', bookingController.createBooking);
router.get('/bookings/user/:userId', bookingController.getUserBookings);
router.put('/bookings/:id/status', bookingController.updateBookingStatus);
router.delete('/bookings/:id', bookingController.deleteBooking);

router.get('/matchmakings', socialController.getMatchmakings);
router.post('/matchmakings', socialController.createMatchmaking);
router.put('/matchmakings/:id', socialController.updateMatchmaking);
router.delete('/matchmakings/:id', socialController.deleteMatchmaking);

router.get('/fields/:fieldId/reviews', socialController.getReviewsByField);
router.post('/fields/:fieldId/reviews', socialController.createReview);
router.delete('/reviews/:id', socialController.deleteReview);

export default router;