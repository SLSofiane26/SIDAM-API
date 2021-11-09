let mongoose = require('mongoose');

let NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  body: {
    type: String,
  },
  image: {
    type: String,
  },
  dateCreation: {
    type: Date,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = Notification = mongoose.model(
  'notification',
  NotificationSchema
);
