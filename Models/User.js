let mongoose = require('mongoose');

let UserSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
  },
  prenom: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  telephone: {
    type: String,
    required: true,
  },
  adresse: {
    type: String,
    required: true,
  },
  codepostal: {
    type: String,
    required: true,
  },
  ville: {
    type: String,
    required: true,
  },
  SIA: {
    type: String,
    required: true,
  },
  motdepasse: {
    type: String,
    required: true,
  },
  identifiant: {
    type: String,
  },
  mdpsecret: {
    type: String,
  },
  armes: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'armes',
    },
  ],
  factures: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'factures',
    },
  ],
  ceder: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ceder',
    },
  ],
  admin: {
    type: Boolean,
    default: false,
  },
  dateCreation: {
    type: Date,
    default: Date.now(),
  },
  dateModification: {
    type: Date,
    defaut: Date.now(),
  },
  sendEmail: {
    type: Boolean,
    default: false,
  },
  resetToken: {
    type: String,
  },
  expToken: {
    type: Number,
    default: 0,
  },
  marque: [{ type: String }],
  type: [{ type: String }],
  deviceToken: {
    type: String,
  },
  nombreArmes: {
    type: Number,
  },
  nombredeCertificat: {
    type: Number,
  },
  nombredeCeder: {
    type: Number,
  },
  autorisation: {
    type: Boolean,
    default: false,
  },
});

module.exports = User = mongoose.model('user', UserSchema);
