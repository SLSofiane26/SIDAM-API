let mongoose = require("mongoose");
let config = require("config");
let db = config.get("mongoURI");

let dbConnect = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true,
    });
    console.log("db connect");
  } catch (err) {
    process.exit(1);
  }
};

module.exports = dbConnect;
