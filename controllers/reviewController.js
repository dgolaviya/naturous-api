// const catchAsync = require('../utils/catchAsync');
const Review = require('../models/reviewModel');
const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');

const setTourUserIds = (req, res, next) => {
  const { user, tour } = req.body;
  if (!tour) {
    req.body.tour = req.params.tourId;
  }
  if (!user) {
    req.body.user = req.user.id;
  }
  next();
};
const getAllReviews = getAll(Review);
const getReview = getOne(Review);
const createReview = createOne(Review);
const updateReview = updateOne(Review);
const deleteReview = deleteOne(Review);

module.exports = {
  createReview,
  getAllReviews,
  deleteReview,
  updateReview,
  setTourUserIds,
  getReview,
};
