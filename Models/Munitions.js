let mongoose = require("mongoose");

let MunitionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "user",
  },
  armes: {
    type: mongoose.Types.ObjectId,
    ref: "armes",
  },
  nombre: {
    type: Number,
    required: true,
  },
  marque: {
    type: String,
  },
  dateachat: {
    type: String,
    required: true,
  },
  preuveachat: {
    type: String,
  },
  dateCreation: {
    type: Date,
    default: Date.now(),
  },
  numerodelot: {
    type: String,
    required: true,
  },
});

module.exports = Munitions = mongoose.model("munitions", MunitionSchema);
