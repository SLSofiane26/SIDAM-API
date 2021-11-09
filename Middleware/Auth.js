let jsw = require("jsonwebtoken");
let config = require("config");

module.exports = async (req, res, next) => {
  try {
    let token = req.header("x-auth-token");

    if (!token) {
      res.json({ msg: "No token acces" });
    }

    let decoded = await jsw.verify(token, config.get("secretToken"));
    req.user = decoded.user;
    next();
  } catch (err) {
    res.json({ msg: "No token acces" });
  }
};
