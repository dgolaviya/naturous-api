const express = require('express');
const morgan = require('morgan');
const path = require('path');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const bookingRouter = require('./routes/bookingRouter');
const reviewRouter = require('./routes/reviewRouter');
const viewsRouter = require('./routes/viewsRouter');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// 1) Global Middlewares
//Set Security Http Headers
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//Limit requests from same IP.
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour.',
});

app.use('/api', limiter);

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data sanitization against No SQL injection like {$gt: ""} is injected in email field
//and it finds all email and you can login into site with only password.
app.use(mongoSanitize());

//Data sanitization against XSS.
app.use(xss());

//Prevent parameter pollution like removing duplicate fields from query string
app.use(
  hpp({
    whiteList: [
      'duration',
      'price',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
    ],
  })
);
//It compresses text or json response
app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) Routes

app.use('/', viewsRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(
  //   `Cannot find requested URL:${req.originalUrl} on this server!`
  // );
  // err.statusCode = 404;
  // err.status = 'fail';
  next(
    new AppError(
      `Cannot find requested URL:${req.originalUrl} on this server!`,
      404
    )
  );
});

app.use(globalErrorHandler);

module.exports = app;
