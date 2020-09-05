const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have name.'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal to 40 characters.'],
      minlength: [10, 'A tour must have at least 10 characters'],
      // validate: [validator.isAlpha, 'A tour must contain letter.'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have durations.'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have group size.'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have difficulty.'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy or medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A tour must have an average rating of at least 1.'],
      max: [5, 'A tour must not have an average rating of more than 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price.'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //This only points to current Document on NEW document creation.
          return val < this.price;
        },
        message:
          'Discount price should be less than or equal to regular price.',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have description.'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image.'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review',
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.virtual('durationInWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Document middleware works only for save and create function it will not work insertMany,findoneandUpdate and all.
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//Embedded User object into tour model

// tourSchema.pre('save', async function (next) {
//   const tourGuidesPromises = this.guides.map(
//     async (id) => await User.findById(id)
//   );
//   this.guides = await Promise.all(tourGuidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save Document!');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//Query Middleware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took time to execute is: ${Date.now() - this.start} ms.`);
  // console.log(docs);
  next();
});

//Agreegation Middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
