let mongoose = require("mongoose");

let ArmesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "user",
  },
  marques: {
    type: String,
  },
  modele: {
    type: String,
    required: true,
  },
  calibre: {
    type: String,
    required: true,
  },
  type: {
    type: String,
  },
  quot: {
    type: Number,
    default: 0,
  },
  serie: {
    type: String,
    required: true,
  },
  dateAchat: {
    type: String,
    required: true,
  },
  garantie: {
    type: String,
    default: null,
  },
  autorisation: {
    type: String,
  },
  pourcentage: {
    type: Number,
    default: 0,
  },
  extension: {
    type: Number,
    default: 0,
  },
  armurier: {
    type: String,
    required: true,
  },
  quantite: {
    type: Number,
    default: 0,
  },
  expLimit: {
    type: Boolean,
    default: false,
  },
  munitions: [{ type: mongoose.Types.ObjectId, ref: "munitions" }],
  cedee: {
    type: Boolean,
  },
  isDivisible: {
    type: Boolean,
    default: false,
  },
  dateCreation: {
    type: Date,
    default: Date.now(),
  },
  expiration: {
    type: String,
    default: null,
  },
  limitEmail: {
    type: String,
    default: true,
  },
  expirationDate: {
    type: Date,
    default: null,
  },
  garantieActuelle: {
    type: Date,
    default: null,
  },
  limitDate: {
    type: String,
  },
  prenom: {
    type: String,
  },
  nom: {
    type: String,
  },
  email: {
    type: String,
  },
  SIA: {
    type: String,
  },
});

module.exports = Arme = mongoose.model("armes", ArmesSchema);
