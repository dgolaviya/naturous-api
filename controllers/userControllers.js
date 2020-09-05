const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteOne, updateOne, getOne, getAll } = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadProfileImage = upload.single('photo');

const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filterObject = (obj, ...allowedFields) => {
  const filterBody = {};
  allowedFields.forEach((el) => {
    if (obj[el]) {
      filterBody[el] = obj[el];
    }
  });
  return filterBody;
};

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

const updateMe = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  //1) If password present in body raise error
  if (password || passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword instead.',
        400
      )
    );
  }
  //2) Update user detail
  //Filter object's first param accepts object and rest parameters are fields which you want to include
  const filterdbody = filterObject(req.body, 'name', 'email');
  if (req.file) filterdbody.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterdbody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      updatedUser,
    },
  });
});

const createUser = (req, res) => {
  res.status(500).json({
    status: 'fail',
    message: 'This route has not been implemented! please use /signUp instead.',
  });
};

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).status({
    status: 'success',
    data: null,
  });
});

const getUser = getOne(User);
const getAllUsers = getAll(User);
//Don't use this method for updating the password as this does not enable all middleware
const updateUser = updateOne(User);
const deleteUser = deleteOne(User);

module.exports = {
  getUser,
  getAllUsers,
  updateUser,
  deleteUser,
  createUser,
  updateMe,
  deleteMe,
  getMe,
  uploadProfileImage,
  resizeUserPhoto,
};
