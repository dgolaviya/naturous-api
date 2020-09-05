const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');

const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const handlerFactory = require('./handlerFactory');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  //2 create checkout session from stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  //3 Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = catchAsync(async (req, res, next) => {
  //This is only temoporar, because it's unsecure: everyone can make bookings withou paying.
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

const createBooking = handlerFactory.createOne(Booking);
const getAllBookings = handlerFactory.getAll(Booking);
const updateBooking = handlerFactory.updateOne(Booking);
const deleteBooking = handlerFactory.deleteOne(Booking);
const getBooking = handlerFactory.getOne(Booking);

module.exports = {
  getCheckoutSession,
  createBookingCheckout,
  createBooking,
  getAllBookings,
  updateBooking,
  deleteBooking,
  getBooking,
};
