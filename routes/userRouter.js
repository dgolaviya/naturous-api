const express = require('express');

const {
  getUser,
  getAllUsers,
  updateUser,
  updateMe,
  deleteUser,
  deleteMe,
  createUser,
  getMe,
  uploadProfileImage,
  resizeUserPhoto,
} = require('../controllers/userControllers');

const {
  signUp,
  login,
  logout,
  forgetPassword,
  resetPassword,
  updateMyPassword,
  protect,
  restrictTo,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signUp', signUp);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgetPassword', forgetPassword);
router.patch('/resetPassword/:token', resetPassword);

//All routes are protected below this middleware.
router.use(protect);

router.patch('/updateMyPassword', updateMyPassword);

router.patch('/updateMe', uploadProfileImage, resizeUserPhoto, updateMe);
router.get('/me', getMe, getUser);
router.delete('/deleteMe', deleteMe);

router.use(restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);

router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
