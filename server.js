const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! Shutting down ...!!');
  process.exit(1);
});

dotenv.config({ path: './config.env' });

process.env.NODE_ENV = process.env.NODE_ENV.trim().toLowerCase();

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Database Connection has been established successfully.');
  });

const app = require('./app');

//Server Startup
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App is runnning on ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! Shutting down ...!!');
  server.close(() => {
    process.exit(1);
  });
});

//It is throwing sync/uncaught exception which is handled above middleware.
//console.log(x);