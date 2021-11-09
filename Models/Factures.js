let mongoose = require("mongoose");

let FactureSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  armes: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "armes",
  },
  serie: {
    type: String,
  },
  marques: {
    type: String,
  },
  modele: {
    type: String,
  },
  type: {
    type: String,
  },
  model: {
    type: String,
  },
  fileName: {
    type: String,
    required: true,
  },
  file: {
    type: String,
    required: true,
  },
  dateCreation: {
    type: Date,
    default: Date.now(),
  },
  valider: {
    type: Boolean,
    default: false,
  },
  nombre: {
    type: Number,
    default: 0,
  },
  munitions: {
    type: Number,
    default: 0,
  },
  munitionsType: [String],
});

module.exports = Factures = mongoose.model("factures", FactureSchema);
