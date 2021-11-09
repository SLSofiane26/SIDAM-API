let express = require("express");
let router = express.Router();
let { check, validationResult } = require("express-validator");
let User = require("../Models/User");
let bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");
let config = require("config");
let auth = require("../Middleware/Auth");
let crypto = require("crypto");
let transporter = require("./Nodemailer.js");
let admin = require("../Routes/FirebaseConfig");
let fs = require("fs");

router.post(
  "/auth",
  [
    check("email", "Email obligatoire").not().isEmpty(),
    check("motdepasse", "Mot de passe obligatoire").not().isEmpty(),
  ],
  async (req, res) => {
    let { email, motdepasse, deviceToken } = req.body;

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    }

    try {
      let user = await User.findOne({ email: email.toLowerCase() });

      let isMatch = await bcrypt.compare(motdepasse, user.motdepasse);

      if (!user) {
        res.status(400).json({ msg: "Utilisateur inconnue" });
      } else if (!isMatch) {
        res.status(400).json({ msg: "Mot de passe incorrect" });
      } else {
        user.deviceToken = deviceToken;

        let payload = {
          user: {
            id: user.id,
          },
        };

        await user.save();

        jwt.sign(
          payload,
          config.get("secretToken"),
          { expiresIn: 3600 },
          (err, token) => {
            if (err) throw err;
            res.json({ token: token, id: user.identifiant, admin: user.admin });
          }
        );
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("SERVOR ERROR");
    }
  }
);

router.post(
  "/user",
  [
    check("nom", "Nom obligatoire").not().isEmpty(),
    check("prenom", "Prénom obligatoire").not().isEmpty(),
    check("email", "Email obligatoire").not().isEmpty(),
    check("telephone", "Telephone obligatoire").not().isEmpty(),
    check("adresse", "Adresse obligatoire").not().isEmpty(),
    check("codepostal", "Code postal obligatoire").not().isEmpty(),
    check("ville", "Ville obligatoire").not().isEmpty(),
    check("SIA", "SIA obligatoire").not().isEmpty(),
  ],
  async (req, res) => {
    let {
      nom,
      prenom,
      email,
      telephone,
      adresse,
      codepostal,
      ville,
      SIA,
      motdepasse,
      deviceToken,
      autorisation,
      admin,
    } = req.body;

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    }

    try {
      let user = await User.findOne({ email: email.toLowerCase() });

      let userb = await User.findOne({ SIA });

      if (user) {
        res.status(400).json("Email utilisee");
      } else {
        if (userb) {
          res.status(400).json("SIA utilisee");
        } else {
          let salt = await bcrypt.genSalt(10);

          let d = {};
          d.nom = nom;
          d.prenom = prenom;
          d.email = email.toLowerCase();
          d.telephone = telephone;
          d.adresse = adresse;
          d.codepostal = codepostal;
          d.ville = ville;
          d.SIA = SIA;
          d.dateCreation = Date.now();
          d.deviceToken = deviceToken;
          d.dateModification = Date.now();
          d.autorisation = autorisation;

          d.motdepasse = await bcrypt.hash(motdepasse, salt);

          let makeid = () => {
            var result = "";
            var characters =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var charactersLength = characters.length;
            for (var i = 0; i < 6; i++) {
              result += characters.charAt(
                Math.floor(
                  Math.random() * charactersLength +
                    (Math.random() * 5) / new Date().getTime()
                )
              );
            }
            return result;
          };

          let makeidBis = () => {
            var result = "";
            var characters =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var charactersLength = characters.length;
            for (var i = 0; i < 6; i++) {
              result += characters.charAt(
                Math.floor(
                  Math.random() * charactersLength +
                    (Math.random() * 5) / new Date().getTime()
                )
              );
            }
            return result;
          };

          let identifiant = makeid();
          let mdpsecret = makeidBis();
          d.identifiant = identifiant;
          d.mdpsecret = mdpsecret;

          user = new User(d);

          await user.save();

          if (user.autorisation) {
            setTimeout(async () => {
              let message = {
                notification: {
                  title: `BIENVENUE`,
                  body: `Bienvenue, vous allez bientot acquérir des mois de garantie supplémentaire!`,
                  sound: "sound_one.mp3",
                },
              };
              await admin.messaging().sendToDevice(user.deviceToken, message);
            }, 172800000);

            await transporter.sendMail({
              from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
              to: user.email,
              subject: "VOTRE ESPACE PERSONNEL EST CREE",
              html: `   
    <div>
    <p>Bonjour ${user.prenom} ${user.nom}, <br></br>Votre compte personnel est créé. Vous allez pouvoir bénéficier
        d’extension de garantie sur vos nouvelles armes CZ et SMITH & WESSON.<br></br>
     <ul>
        <li> Accéder à votre coffre fort virtuel pour enregistrer votre nouvelle arme CZ ou SMITH & WESSON</li>
        <br>
        <li>
            Enregistrer vos achats de munitions de marque SELLIER & BELLOT et/ou MAGTECH pour chaque arme</li>
            <br>
        <li>
            Bénéficiez d’une extension de garantie de 3 mois par tranches de 500 munitions achetées.
        </li>
    </ul>
    <br>
    <p><br> <p>Cordialement, </p> </br>
    <div>

    <img style="margin-top:10px;" width="80%" 
    src="https://sidam.suncha.fr/api/PDF/signature.jpg" />
        <p> <span style="color: blue;font-size: x-small;">Ce message électronique et tous les fichiers attachés qu'il
                contient sont
                confidentiels et
                destinés
                exclusivement à l'usage de la personne à laquelle ils sont adressés. Si vous avez reçu ce message
                par
                erreur, merci de le retourner à son émetteur. Les idées et opinions présentées dans ce message sont
                celles de son auteur, et ne représentent pas nécessairement celles de la société SIDAM ou d'une
                quelconque de ses filiales</span>.<span style="color: red;font-weight: bold;font-size: x-small;"> La
                publication,
                l'usage, la
                distribution, l'impression ou la
                copie non
                autorisée de ce message et des attachements qu'il contient sont strictement interdits.</span><br>
            <span style="color: blue;font-size: x-small;">

                This e-mail and any files transmitted with it are confidential and intended solely for the use of
                the
                individual to whom it is addressed.If you have received this email in error please send it back to
                the
                person that sent it to you. Any views or opinions presented are solely those of its author and do
                not
                necessarily represent those of SIDAM Company or any of its subsidiary companies.</span> <span
                style="color: red;font-weight: bold;font-size: x-small;"> Unauthorized
                publication, use, dissemination, forwarding, printing or copying of this email and its associated
                attachments is strictly prohibited.</span>
        </p>
    </div>

</div>
    `,
            });
            jwt.sign(
              payload,
              config.get("secretToken"),
              { expiresIn: 3600 },
              (err, token) => {
                if (err) throw err;
                res.json({
                  token: token,
                  id: user.identifiant,
                  admin: user.admin,
                });
              }
            );
          } else {
            jwt.sign(
              payload,
              config.get("secretToken"),
              { expiresIn: 3600 },
              (err, token) => {
                if (err) throw err;
                res.json({
                  token: token,
                  id: user.identifiant,
                  admin: user.admin,
                });
              }
            );
          }
        }
      }
    } catch (err) {
      console.log(err);
      res.send("SERVEUR ERREUR");
    }
  }
);

router.get("/user", auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select(
      "-motdepasse -mdpsecret"
    );
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post(
  "/authd",
  [check("identifiant", "Identifiant obligatoire").not().isEmpty()],
  async (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    }

    try {
      let { identifiant, deviceToken } = req.body;

      let user = await User.findOne({ identifiant });

      if (!user) {
        res.status(400).json({ msg: "Identifiants inconnues" });
      }

      let payload = {
        user: {
          id: user.id,
        },
      };

      user.deviceToken = deviceToken;

      await user.save();

      jwt.sign(
        payload,
        config.get("secretToken"),
        { expiresIn: 3600 },
        (err, token) => {
          if (err) throw err;
          res.json({ token: token, id: user.identifiant, admin: user.admin });
        }
      );
    } catch (err) {
      res.send("SERVEUR ERREUR");
    }
  }
);

router.post("/NewPassword", async (req, res) => {
  let { token, motdepasse } = req.body;
  try {
    let user = await User.findOne({ resetToken: token });
    let salt = await bcrypt.genSalt(10);
    user.motdepasse = await bcrypt.hash(motdepasse, salt);
    await user.save();
    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERROR");
  }
});

router.post("/NewPasswordBis", async (req, res) => {
  let { email, secret, motdepasse } = req.body;
  try {
    let user = await User.findOne({ resetToken: secret });

    if (!user) {
      res.status(404).send({ msg: "Pas d'utilisateur" });
    } else {
      if (user.email === email.toLowerCase()) {
        let salt = await bcrypt.genSalt(10);
        user.motdepasse = await bcrypt.hash(motdepasse, salt);
        await user.save();
        res.json({ msg: "ok" });
      } else {
        res.status(404).send({ msg: "Pas d'utilisateur" });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERROR");
  }
});

router.post(
  "/authb",
  [
    check("identifiant", "Identifiant obligatoire").not().isEmpty(),
    check("mdpsecret", "Mot de passe obligatoire").not().isEmpty(),
  ],
  async (req, res) => {
    let { identifiant, motdepasse, deviceToken } = req.body;

    try {
      let user = await User.findOne({ identifiant });

      if (!user || user.mdpsecret !== motdepasse) {
        res.status(500).json({ msg: "Mot de passe incorrect" });
      } else {
        user.deviceToken = deviceToken;

        await user.save();

        let payload = {
          user: {
            id: user.id,
          },
        };

        jwt.sign(
          payload,
          config.get("secretToken"),
          { expiresIn: 3600 },
          (err, token) => {
            res.json({ token: token, id: user.identifiant, admin: user.admin });
          }
        );
      }
    } catch (err) {
      console.log(err);
      res.send("SERVEUR ERREUR");
    }
  }
);

router.post("/userss", auth, async (req, res) => {
  let {
    nom,
    prenom,
    email,
    adresse,
    telephone,
    SIA,
    motdepasse,
    codepostal,
    autorisation,
  } = req.body;

  try {
    let user = await User.findById(req.user.id);

    let d = {};

    if (nom) d.nom = nom;
    if (prenom) d.prenom = prenom;
    if (codepostal) d.codepostal = codepostal;
    if (email) d.email = email.toLowerCase();
    if (adresse) d.adresse = adresse;
    if (telephone) d.telephone = telephone;
    if (SIA) d.SIA = SIA;

    d.dateModification = Date.now();

    d.autorisation = autorisation;

    if (motdepasse) {
      let saltb = await bcrypt.genSalt(10);
      d.motdepasse = await bcrypt.hash(motdepasse, saltb);
    }

    user = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $set: d },
      { new: true }
    );
    await user.save();

    res.status(200).json({ msg: "Utilisateur modifié" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/passwordreset", async (req, res) => {
  let { email } = req.body;

  try {
    let user = await User.findOne({ email: email.toLowerCase() });

    user.resetToken = crypto.randomBytes(32).toString("hex");

    console.log(req.body);

    if (!user) {
      res.json({ msg: "email" });
    } else {
      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: email,
        subject: "IDENTIFIANTS SIDAM",
        html: `<div>
        <div>
         <p>Bonjour ${user.prenom} ${user.nom}, <br></br> Suite à votre demande de récupération de mot de passe, veuillez cliquer sur le lien ci-dessous :  <br></br><a href="https://sidam.suncha.fr/api/api/deeplinking/${user.resetToken}" style="color: black"><br>
             Modifier mon mot de passe via mon application</a><br></br>

             <br> <p>Cordialement, </p> </br>
             <div>
             <img style="margin-top:10px;" width="80%" 
             src="https://sidam.suncha.fr/api/PDF/signature.jpg" />

             <p> <span style="color: blue;font-size: x-small;">Ce message électronique et tous les fichiers attachés qu'il
                     contient sont
                     confidentiels et
                     destinés
                     exclusivement à l'usage de la personne à laquelle ils sont adressés. Si vous avez reçu ce message
                     par
                     erreur, merci de le retourner à son émetteur. Les idées et opinions présentées dans ce message sont
                     celles de son auteur, et ne représentent pas nécessairement celles de la société SIDAM ou d'une
                     quelconque de ses filiales</span>.<span style="color: red;font-weight: bold;font-size: x-small;"> La
                     publication,
                     l'usage, la
                     distribution, l'impression ou la
                     copie non
                     autorisée de ce message et des attachements qu'il contient sont strictement interdits.</span><br>
                 <span style="color: blue;font-size: x-small;">
     
                     This e-mail and any files transmitted with it are confidential and intended solely for the use of
                     the
                     individual to whom it is addressed.If you have received this email in error please send it back to
                     the
                     person that sent it to you. Any views or opinions presented are solely those of its author and do
                     not
                     necessarily represent those of SIDAM Company or any of its subsidiary companies.</span> <span
                     style="color: red;font-weight: bold;font-size: x-small;"> Unauthorized
                     publication, use, dissemination, forwarding, printing or copying of this email and its associated
                     attachments is strictly prohibited.</span>
             </p>
             </div>
         </div>`,
      });

      await user.save();

      res.json({ msg: "Email envoyée" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/deeplinking/:id", (req, res) => {
  res.redirect(`sidam://sidamApp/ModificationPass/${req.params.id}`);
});

router.get("/reglement", (req, res) => {
  res.redirect(`sidam://sidamApp/reglement`);
});

module.exports = router;
