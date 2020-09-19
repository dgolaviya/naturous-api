const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');

const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    httponly: true,
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createAndSendToken(newUser, 201, req, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1} If email and password are not provided.
  if (!email || !password) {
    return next(new AppError('Plese provide email and password.', 400));
  }
  //2) If user exists and password are valid.
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  //3) If everything ok then Send token to user.
  createAndSendToken(user, 200, req, res);
});

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    httponly: true,
    expires: new Date(Date.now() + 10 * 1000),
  });
  res.status(200).json({
    status: 'success',
  });
};

const protect = catchAsync(async (req, res, next) => {
  const { authorization } = req.headers;
  let token;
  //1) Getting token and check of it's there
  if (authorization && authorization.startsWith('Bearer')) {
    token = authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError(
        'You are not logged in. Please login again to get access',
        401
      )
    );
  }
  //2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3) Check if User still exists.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }
  //4) Check if user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User changed password recently. Please login again.'),
      401
    );
  }
  //Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

const isLoggedIn = async (req, res, next) => {
  //1) Getting jwt from cookie
  if (req.cookies.jwt) {
    try {
      //2) Verification of token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // console.log(decoded);

      //3) Check if User still exists.
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4) Check if user changed password after the token was issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //Grant access to protected route
      res.locals.user = currentUser;
      return next();
    } catch (error) {
      // console.log(error);
      return next();
    }
  }
  next();
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

const forgetPassword = catchAsync(async (req, res, next) => {
  //Find user from database. via email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }

  // Generate random token for changing password.
  const resetToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      messsage: 'Token sent to email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Please try again later.',
        500
      )
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) Check if user is exits && password is corect
  if (!user) {
    return next(new AppError('Token is invalid or expired.', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Change password changeAt property
  // 4) If everything ok send token to client.
  createAndSendToken(user, 200, req, res);
});

const updateMyPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;
  //1) Get User from collection
  const user = await User.findById(req.user._id).select('+password');

  //2 Check if posted current password is correct
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  //3 If so update password
  //4 login user in, send JWT
  createAndSendToken(user, 200, req, res);
});

module.exports = {
  signUp,
  login,
  logout,
  protect,
  restrictTo,
  forgetPassword,
  resetPassword,
  updateMyPassword,
  isLoggedIn,
};
