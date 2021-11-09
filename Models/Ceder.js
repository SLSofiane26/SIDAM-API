let mongoose = require('mongoose');

let CederSchema = new mongoose.Schema({
  from: {
    type: mongoose.Types.ObjectId,
    ref: 'user',
  },
  fromNom: {
    type: String,
  },
  fromSIA: {
    type: String,
  },
  fromEmail: {
    type: String,
  },
  to: {
    type: mongoose.Types.ObjectId,
    ref: 'user',
  },
  toNom: {
    type: String,
  },
  toSIA: {
    type: String,
  },
  toEmail: {
    type: String,
  },
  armes: {
    type: mongoose.Types.ObjectId,
    ref: 'armes',
  },
  armurier: {
    nom: {
      type: String,
    },
    telephone: {
      type: String,
    },
    email: {
      type: String,
    },
  },
  valider: {
    type: Boolean,
  },
  dateCreation: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = Ceder = mongoose.model('ceder', CederSchema);
