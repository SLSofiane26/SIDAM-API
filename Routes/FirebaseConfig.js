let admin = require("firebase-admin");
let serviceAccount = require("../sidamsuncha-firebase-adminsdk-on3j1-65aabb1e14.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
