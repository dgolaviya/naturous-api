const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');

const deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(
        new AppError(`No document fonud with the id:${req.params.id}`, 404)
      );
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(
        new AppError(`No document fonud with the id:${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

const getOne = (Model, popOptions) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id).populate(popOptions);
    if (!doc) {
      return next(
        new AppError(`No document fonud with the id:${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

const getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    const { requestTime, query, params } = req;
    if (params.tourId) {
      req.query.tour = params.tourId;
    }
    //Execute an Query
    const features = new APIFeatures(Model.find(), query)
      .filter()
      .sort()
      .fieldLimiting()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    //Send Response
    res.status(200).json({
      status: 'success',
      requestedAt: requestTime,
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
};

module.exports = {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
};
