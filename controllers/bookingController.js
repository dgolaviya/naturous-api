const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');

const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const handlerFactory = require('./handlerFactory');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  //2 create checkout session from stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
        ],
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

// const createBookingCheckout = catchAsync(async (req, res, next) => {
//   //This is only temoporar, because it's unsecure: everyone can make bookings withou paying.
//   const { tour, user, price } = req.query;
//   if (!tour && !user && !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.display_items[0].amount / 100;
  await Booking.create({ tour, user, price });
};

const webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    res.status(400).send(`webhook error: ${error.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }
  res.status(200).json({
    recieved: true,
  });
};

const createBooking = handlerFactory.createOne(Booking);
const getAllBookings = handlerFactory.getAll(Booking);
const updateBooking = handlerFactory.updateOne(Booking);
const deleteBooking = handlerFactory.deleteOne(Booking);
const getBooking = handlerFactory.getOne(Booking);

module.exports = {
  getCheckoutSession,
  webhookCheckout,
  // createBookingCheckout,
  createBooking,
  getAllBookings,
  updateBooking,
  deleteBooking,
  getBooking,
};
