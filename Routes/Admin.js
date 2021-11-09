let express = require("express");
let router = express.Router();
let User = require("../Models/User");
let Arme = require("../Models/Armes");
let Ceder = require("../Models/Ceder");
let auth = require("../Middleware/Auth");
let Munition = require("../Models/Munitions");
let Facture = require("../Models/Factures");
let { check, validationResult } = require("express-validator");
let jwt = require("jsonwebtoken");
let config = require("config");
let bcrypt = require("bcrypt");
let multer = require("multer");
let Notification = require("../Models/Notification");
let admin = require("../Routes/FirebaseConfig");
let transporter = require("../Routes/Nodemailer.js");
let fs = require("fs");
let db = config.get("mongoURI");
let mongodb = require("mongodb").MongoClient;
let fastcsv = require("fast-csv");
let path = require("path");
let puppeteer = require("puppeteer");
let handlebars = require("handlebars");

let storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./notification/");
  },
  filename: function (req, file, callback) {
    callback(null, `${new Date().getTime()}${file.originalname}`);
  },
});

let upload = multer({ storage: storage });

let compile = async (templateName, data) => {
  let filePath = path.join(process.cwd(), "/PDF", `${templateName}.hbs`);
  let html = fs.readFileSync(filePath, "utf-8", (err, succes) => {
    if (err) {
      throw err;
    }
  });
  return handlebars.compile(html)(data);
};

router.post("/notification", upload.any("notification"), async (req, res) => {
  try {
    let notification = new Notification();
    notification.image = req.files[0].path;
    notification.dateCreation = new Date();

    await notification.save();
    res.json(notification);
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERROR");
  }
});

router.post("/notificationB", async (req, res) => {
  let { deviceToken, body, title } = req.body;
  try {
    let ff = deviceToken.filter((x) => x !== null);
    let d = {};
    d.image = null;
    d.dateCreation = new Date();
    d.body = body;
    d.title = title;

    let notification = new Notification(d);

    let message = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: `${process.env.API_URL}/notification/logo.png`,
      },
      tokens: ff,
    };

    await admin.messaging().sendMulticast(message);

    await notification.save();
    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err.message);

    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/notification/:id", async (req, res) => {
  let { deviceToken, body, title } = req.body;
  try {
    let notification = await Notification.findById(req.params.id);
    notification.body = body;
    notification.title = title;

    let ff = deviceToken.filter((x) => x !== null);

    let message = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: `${process.env.API_URL}/${notification.image}`,
      },
      tokens: ff,
    };

    await admin.messaging().sendMulticast(message);

    await notification.save();

    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("SERVEUR ERROR");
  }
});

let gg = Date.now();

let moiss = new Date(gg).getMonth() + 1;

let annn = new Date(gg).getFullYear();

let jourss = new Date(gg).getDate();

if (moiss < 10) {
  moiss = "0" + moiss;
}

if (jourss < 10) {
  jourss = "0" + jourss;
}

let dateBB = `${jourss}/${moiss}/${annn}`;

router.post(
  "/auth",
  [
    check("email", "Email obligatoire").not().isEmpty(),
    check("motdepasse", "Mot de passe obligatoire").not().isEmpty(),
  ],
  async (req, res) => {
    let { email, motdepasse } = req.body;

    try {
      let user = await User.findOne({ email: email.toLowerCase() });

      let isMatch = await bcrypt.compare(motdepasse, user.motdepasse);

      if (!user) {
        res.status(400).json({ msg: "Utilisateur inconnue" });
      }

      if (!isMatch) {
        res.status(400).json({ msg: "Mot de passe incorrect" });
      }

      if (!user.admin) {
        res.status(400).json({ msg: "Non autorisé" });
      }

      if (user.admin) {
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
            if (err) throw err;
            res.json({ token: token, admin: user.admin });
          }
        );
        await user.save();
      }
    } catch (err) {
      res.send("SERVEUR ERREUR");
    }
  }
);

router.get("/users", auth, async (req, res) => {
  try {
    let user = await User.find().select("-motdepasse -mdpsecret");
    res.json(user);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/users/:id", auth, async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select(
      "-motdepasse -mdpsecret"
    );
    res.json(user);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/users/:id", auth, async (req, res) => {
  let { nom, prenom, email, adresse, telephone, SIA, admin, autorisation } =
    req.body;
  try {
    let user = await User.findById(req.params.id);
    let d = {};
    if (nom) d.nom = nom;
    if (prenom) d.prenom = prenom;
    if (email) d.email = email.toLowerCase();
    if (adresse) d.adresse = adresse;
    if (telephone) d.telephone = telephone;
    if (SIA) d.SIA = SIA;
    if (admin) d.admin = admin;
    d.autorisation = autorisation;
    d.dateModification = Date.now();

    user = await User.findOneAndUpdate(
      { _id: req.params.id },
      { $set: d },
      { new: true }
    );

    await user.save();
    res.status(200).json({ msg: "Utilisateur modifié" });
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/garantie", auth, async (req, res) => {
  let { email, sujet } = req.body;
  try {
    let user = await User.find({ email: email.toLowerCase() });

    await Arme.find({ user: user }, function (err, FoundObject) {
      FoundObject.forEach(async (meme) => {
        await Arme.updateMany(
          { user: user },
          { $set: { garantie: Number(meme.garantie) + Number(sujet) } }
        );
      });
    });

    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/datelimite", auth, async (req, res) => {
  let { email, sujet } = req.body;
  try {
    let user = await User.find({ email: email.toLowerCase() });

    await Arme.find({ user: user }, function (err, FoundObject) {
      FoundObject.forEach(async (meme) => {
        await Arme.updateMany(
          { user: user },
          { $set: { limitDate: Number(meme.limitDate) + Number(sujet) } }
        );
      });
    });

    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/armes", auth, async (req, res) => {
  try {
    let arme = await Arme.find();
    res.json(arme);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.delete("/armes/:id", auth, async (req, res) => {
  try {
    let armes = await Arme.findById(req.params.id);

    let ceder = await Ceder.findOne({ armes: req.params.id });

    let user = await User.findById(armes.user);

    let dd = await Facture.findOne({ armes: armes._id });

    let dada = user.factures.findIndex((x) => {
      x._id === dd._id;
    });

    user.factures.splice(dada, 1);

    await Facture.findOneAndDelete({ armes: armes._id });

    await Munition.deleteMany({ armes: armes._id });

    armes.munitions = [];

    let d = user.armes.findIndex((x) => x === armes._id);

    user.armes.splice(d, 1);

    if (ceder) {
      user.armes.splice(d, 1);
      let f = user.ceder.findIndex((x) => x === armes._id);
      user.ceder.splice(f, 1);
      await ceder.remove();
      await armes.remove();
      await user.save();
    }

    await user.save();
    await armes.remove();

    res.json({ msg: "DELETE" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/arme/:id", auth, async (req, res) => {
  try {
    let arme = await Arme.findById(req.params.id);
    let facture = await Facture.find({ armes: arme._id });
    res.json({ arme: arme, facture: facture });
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/armes/:id", auth, async (req, res) => {
  try {
    let user = await User.findById(req.params.id)
      .populate("armes")
      .select("-motdepasse -mdpsecret");
    res.json(user);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/munitions/:id", auth, async (req, res) => {
  try {
    let armes = await Arme.findById(req.params.id).populate("munitions");
    res.json(armes);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.delete("/munitions/:id", auth, async (req, res) => {
  try {
    let munition = await Munition.findById(req.params.id);

    let arme = await Arme.findById(munition.armes);

    arme.quantite = arme.quantite - munition.nombre;

    let percentageMunition = (Number(munition.nombre) / 500) * 100;

    let percentage = arme.pourcentage;

    let newP = percentage - percentageMunition;

    if (newP < 0 && newP >= -100) {
      arme.extension = arme.extension - 1;
      arme.pourcentage = 100 - Math.abs(newP);
    }

    if (newP === 0) {
      arme.pourcentage = 0;
    }

    if (
      percentageMunition === 180 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (arme.extension === 1 && percentageMunition === 180) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (percentageMunition === 180 && arme.pourcentage === 0) {
      arme.pourcentage = 0;
      arme.extension = arme.extension - 1;
    }

    if (
      percentageMunition === 160 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (percentageMunition === 160 && arme.extension === 1) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (percentageMunition === 160 && arme.pourcentage === 0) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (
      percentageMunition === 120 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (percentageMunition === 120 && arme.extension === 1) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (percentageMunition === 120 && arme.pourcentage === 0) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (
      percentageMunition === 140 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (percentageMunition === 140 && arme.extension === 1) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (percentageMunition === 140 && arme.pourcentage === 0) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (
      percentageMunition === 120 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (percentageMunition === 120 && arme.extension === 1) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (percentageMunition === 120 && arme.pourcentage === 0) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (arme.pourcentage <= 0) {
      arme.pourcentage = 0;
    }

    if (
      percentageMunition > 100 &&
      percentageMunition < 200 &&
      percentage !== 120 &&
      percentageMunition !== 140 &&
      percentageMunition !== 120 &&
      percentageMunition !== 160 &&
      percentageMunition !== 180 &&
      arme.extension > 1 &&
      arme.pourcentage !== 0
    ) {
      arme.pourcentage = percentageMunition - 100;
      arme.extension = arme.extension - 1;
    }

    if (
      percentageMunition > 100 &&
      percentageMunition < 200 &&
      percentage !== 120 &&
      percentageMunition !== 140 &&
      percentageMunition !== 120 &&
      percentageMunition !== 160 &&
      percentageMunition !== 180 &&
      arme.extension === 1
    ) {
      arme.pourcentage = 0;
      arme.extension = 0;
    }

    if (
      percentageMunition > 100 &&
      percentageMunition < 200 &&
      percentageMunition !== 140 &&
      percentageMunition !== 120 &&
      percentageMunition !== 160 &&
      percentageMunition !== 180 &&
      arme.pourcentage === 0
    ) {
      arme.pourcentage = 0;
      arme.extension = arme.extension - 1;
    }

    if (percentageMunition >= 200) {
      let d = percentageMunition / 100;

      arme.extension = arme.extension - Math.floor(d);
      arme.pourcentage = arme.pourcentage - d * 100;
    }

    if (arme.pourcentage <= 0) {
      arme.pourcentage = 0;
    }

    if (arme.extension <= 0) {
      arme.extension = 0;
    }

    if (newP < 0) {
      newP = 0;
    }

    if (arme.pourcentage >= 100) {
      arme.pourcengtage = 0;
    }

    let d = arme.munitions.findIndex((x) => x == munition._id);

    arme.munitions.splice(d, 1);

    await munition.remove();

    await arme.save();

    res.json({ msg: "ok" });
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/ceder/:id", auth, async (req, res) => {
  try {
    let ceder = await Ceder.findById(req.params.id);

    let user = await User.findById(ceder.from);
    let arme = await Arme.findById(ceder.armes);
    let newUser = await User.findById(ceder.to);

    let facture = await Facture.findOne({ armes: arme._id });

    let factureindex = user.factures.findIndex((x) => x === facture._id);

    if (!ceder) {
      res.json({ msg: "ok" });
    } else if (!arme) {
      await ceder.remove();
      res.json({ msg: "ok" });
    } else {
      if (user.email === newUser.email) {
        ceder.valider = true;
        arme.cedee = false;
        let dd = user.ceder.findIndex((x) => x === ceder._id);
        user.ceder.splice(dd, 1);
        await user.save();
        await arme.save();
        await newUser.save();
        await ceder.save();
        res.json({ msg: "ok" });
      } else {
        user.factures.splice(factureindex, 1);

        await Facture.findOneAndDelete({ armes: arme._id });

        let dataa = {};

        dataa.name = newUser.nom;

        dataa.prenom = newUser.prenom;

        dataa.email = newUser.email;

        dataa.SIA = newUser.SIA;

        dataa.telephone = newUser.telephone;

        dataa.adresse = newUser.adresse;

        dataa.codepostal = newUser.codepostal;

        dataa.ville = newUser.ville;

        dataa.identifiant = newUser.identifiant;

        let da = arme.garantie;

        let ffd = arme.extension * 7889400000;

        let dateGaranti = Number(da) + Number(ffd);

        let dateGarantie = new Date(dateGaranti).toDateString();

        let m = new Date(dateGarantie).getMonth();

        let fff = m + 1;

        if (fff < 10) {
          fff = "0" + fff;
        }

        let j = new Date(dateGarantie).getDate();

        if (j < 10) {
          j = "0" + j;
        }

        let an = new Date(dateGarantie).getFullYear();

        let date = `${j}/${fff}/${an}`;

        let dateB = date.toString();

        dataa.garantie = dateB;

        dataa.extGarantie = new Date(
          Number(arme.garantie)
        ).toLocaleDateString();

        dataa.munitions = arme.quantite;

        dataa.serie = arme.serie;

        dataa.calibre = arme.calibre;

        dataa.categories = arme.modele;

        dataa.marque = arme.marques === "SMITHWESSON" ? "SMITH & WESSON" : "CZ";

        dataa.type = arme.type;

        dataa.armurier = arme.armurier;

        dataa.dateAchat = arme.dateAchat;

        dataa.cumul = arme.extension;

        dataa.date = dateB;

        let browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"],
        });

        let page = await browser.newPage();

        let content = await compile("template", dataa);

        let dd = new Date(Date.now()).getTime();

        await page.setContent(content);

        await page.emulateMediaType("screen");

        await page.pdf({
          format: "A4",
          path: path.join(process.cwd() + "/PDF", `${dd}${newUser._id}.pdf`),
          printBackground: true,
        });

        await browser.close();

        let fac = {};

        fac.user = req.user.id;

        fac.armes = arme._id;
        fac.serie = arme.serie;
        fac.modele = arme.modele;
        fac.marques = arme.marques;
        fac.type = arme.type;
        fac.nombre = arme.quantite;
        fac.munitions = arme.quantite;
        fac.valider = true;
        fac.dateCreation = Date.now();

        fac.fileName = `${dd}${newUser._id}`;

        fac.file = `/PDF/${dd}${newUser._id}.pdf`;

        fac.dateCreation = new Date(Date.now()).getTime();

        let factu = new Facture(fac);

        newUser.factures.unshift(factu);

        ceder.valider = true;

        let f = user.armes.findIndex((x) => x === arme.id);

        user.armes.splice(f, 1);

        let d = user.ceder.findIndex((x) => x === ceder._id);

        user.ceder.splice(d, 1);

        arme.cedee = false;

        arme.user = newUser.id;

        if (user.autorisation) {
          await transporter.sendMail({
            from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
            to: user.email,
            subject: "TRANSFERT ACCEPTÉ",
            html: `<div>
  
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre demande de transfert a été acceptée pour l'arme :</li>
            <ul>
                <li>${arme.marques}</li>
                <li> ${arme.modele}</li>
                <li> ${arme.calibre}</li>
                <li> ${arme.type}</li>
                <li> ${arme.serie}</li>
            </ul>
        </ul></br>
        <p>${newUser.nom} ${newUser.prenom} recevra prochainement l'arme avec la totalité des munitions.</p>
     
        <br><p>Cordialement, </p> </br>
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

          newUser.armes.unshift(arme._id);

          await user.save();
          await arme.save();
          await factu.save();

          await newUser.save();
          await ceder.save();
          res.json({ msg: "ok" });
        } else {
          newUser.armes.unshift(arme._id);
          await user.save();
          await arme.save();
          await factu.save();

          await newUser.save();
          await ceder.save();
          res.json({ msg: "ok" });
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/cedermodification/:id", auth, async (req, res) => {
  let { email } = req.body;
  try {
    let ceder = await Ceder.findById(req.params.id);
    let newUser = await User.findOne({ email: ceder.fromEmail });
    let newUserArme = await User.findOne({ email: email.toLowerCase() });
    if (!ceder) {
      await ceder.remove();
      res.json({ msg: "ok" });
    } else if (!newUserArme) {
      res.status(400).send("Serveur error");
    } else {
      ceder.toNom = newUserArme.nom;
      ceder.toSIA = newUserArme.SIA;
      ceder.toEmail = newUserArme.email;
      ceder.to = newUserArme._id;
      await ceder.save();
      res.json({ msg: "ok" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Servor error");
  }
});

router.post("/cederd/:id", auth, async (req, res) => {
  try {
    let ceder = await Ceder.findById(req.params.id);

    let user = await User.findById(ceder.from);

    let arme = await Arme.findById(ceder.armes);

    let newUser = await User.findOne({ email: ceder.toEmail });

    let facture = await Facture.findOne({ armes: arme._id });

    let factureindex = user.factures.findIndex((x) => x === facture._id);

    if (!newUser) {
      res.status(404).send("NO USER");
    } else {
      if (!ceder) {
        res.json({ msg: "ok" });
      } else {
        ceder.valider = true;
        if (!arme) {
          await ceder.remove();
          res.json({ msg: "ok" });
        } else {
          if (user.email === newUser.email) {
            ceder.valider = true;
            arme.cedee = false;
            let d = user.ceder.findIndex((x) => x === ceder._id);
            user.ceder.splice(d, 1);

            if (user.autorisation) {
              await transporter.sendMail({
                from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
                to: user.email,
                subject: "TRANSFERT ACCEPTÉ",
                text: `Transfert accepté`,
                html: `<div>
      
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre demande de transfert a été acceptée pour l'arme :</li>
            <ul>
                <li>${arme.marques}</li>
                <li> ${arme.modele}</li>
                <li> ${arme.calibre}</li>
                <li> ${arme.type}</li>
                <li> ${arme.serie}</li>
            </ul>
        </ul></br>
        <p>L'armurier ${newUser.nom} (email : ${newUser.email}) recevra prochainement l'arme avec la totalité des munitions.</p>
    </div>
    <br><p>Cordialement, </p> </br>
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
              await arme.save();
              await newUser.save();
              await ceder.save();

              res.json({ msg: "ok" });
            } else {
              await user.save();
              await arme.save();
              await newUser.save();
              await ceder.save();

              res.json({ msg: "ok" });
            }
          } else {
            user.factures.splice(factureindex, 1);

            await Facture.findOneAndDelete({ armes: arme._id });

            let dataa = {};

            dataa.name = newUser.nom;

            dataa.prenom = newUser.prenom;

            dataa.email = newUser.email;

            dataa.SIA = newUser.SIA;

            dataa.telephone = newUser.telephone;

            dataa.adresse = newUser.adresse;

            dataa.codepostal = newUser.codepostal;

            dataa.ville = newUser.ville;

            dataa.identifiant = newUser.identifiant;

            let da = arme.garantie;

            let ffd = arme.extension * 7889400000;

            let dateGaranti = Number(da) + Number(ffd);

            let dateGarantie = new Date(dateGaranti).toDateString();

            let m = new Date(dateGarantie).getMonth();

            let fff = m + 1;

            if (fff < 10) {
              fff = "0" + fff;
            }

            let j = new Date(dateGarantie).getDate();

            if (j < 10) {
              j = "0" + j;
            }

            let an = new Date(dateGarantie).getFullYear();

            let date = `${j}/${fff}/${an}`;

            let dateB = date.toString();

            dataa.garantie = dateB;

            dataa.extGarantie = new Date(
              Number(arme.garantie)
            ).toLocaleDateString();

            dataa.munitions = arme.quantite;

            dataa.serie = arme.serie;

            dataa.calibre = arme.calibre;

            dataa.categories = arme.modele;

            dataa.marque =
              arme.marques === "SMITHWESSON" ? "SMITH & WESSON" : "CZ";

            dataa.type = arme.type;

            dataa.armurier = arme.armurier;

            dataa.dateAchat = arme.dateAchat;

            dataa.cumul = arme.extension;

            dataa.date = dateB;

            let browser = await puppeteer.launch({
              headless: true,
              args: ["--no-sandbox"],
            });

            let page = await browser.newPage();

            let content = await compile("template", dataa);

            let dd = new Date(Date.now()).getTime();

            await page.setContent(content);

            await page.emulateMediaType("screen");

            await page.pdf({
              format: "A4",
              path: path.join(
                process.cwd() + "/PDF",
                `${dd}${newUser._id}.pdf`
              ),
              printBackground: true,
            });

            await browser.close();

            let fac = {};

            fac.user = newUser._id;

            fac.armes = arme._id;
            fac.serie = arme.serie;
            fac.modele = arme.modele;
            fac.marques = arme.marques;
            fac.type = arme.type;
            fac.nombre = arme.quantite;
            fac.munitions = arme.quantite;
            fac.valider = true;
            fac.dateCreation = Date.now();

            fac.fileName = `${dd}${newUser._id}`;

            fac.file = `/PDF/${dd}${newUser._id}.pdf`;

            fac.dateCreation = new Date(Date.now()).getTime();

            let factu = new Facture(fac);

            newUser.factures.unshift(factu);

            ceder.valider = true;

            let f = user.armes.findIndex((x) => x === arme.id);

            user.armes.splice(f, 1);

            arme.cedee = false;

            let d = user.ceder.findIndex((x) => x === ceder._id);

            user.ceder.splice(d, 1);

            arme.user = newUser.id;

            if (user.autorisation) {
              await transporter.sendMail({
                from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
                to: user.email,
                subject: "TRANSFERT ACCEPTÉ",
                text: `Transfert accepté`,
                html: `<div>
      
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre demande de transfert a été acceptée pour l'arme :</li>
            <ul>
                <li>${arme.marques}</li>
                <li> ${arme.modele}</li>
                <li> ${arme.calibre}</li>
                <li> ${arme.type}</li>
                <li> ${arme.serie}</li>
            </ul>
        </ul></br>
        <p>L'armurier ${newUser.nom} (email : ${newUser.email}) recevra prochainement l'arme avec la totalité des munitions.</p>
    </div>
    <br><p>Cordialement, </p> </br>
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
              newUser.armes.unshift(arme._id);

              await user.save();
              await arme.save();
              await factu.save();

              await newUser.save();
              await ceder.save();
              res.json({ msg: "ok" });
            } else {
              newUser.armes.unshift(arme._id);

              await user.save();
              await arme.save();
              await factu.save();

              await newUser.save();
              await ceder.save();
              res.json({ msg: "ok" });
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/ceder", auth, async (req, res) => {
  try {
    let ceder = await Ceder.find();
    let d = ceder.filter((x) => x.valider === false);
    res.json(d);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/cederB", auth, async (req, res) => {
  try {
    let ceder = await Ceder.find();
    let d = ceder.filter((x) => x.valider === true);

    res.json(d);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/cederannulez/:id", auth, async (req, res) => {
  try {
    let ced = await Ceder.findById(req.params.id);
    let NewUser = await User.findById(ced.to);
    let user = await User.findById(ced.from);
    let armes = await Arme.findById(ced.armes);
    let facture = await Facture.findOne({ armes: armes._id });

    let factureindex = NewUser.factures.findIndex((x) => x === facture._id);

    if (!ced) {
      res.json({ msg: "ok" });
    } else if (armes) {
      if (NewUser.email === user.email) {
        armes.cedee = true;
        ced.valider = false;
        await user.save();
        await ced.save();
        await armes.save();
        res.json({ msg: "ok" });
      } else {
        NewUser.factures.splice(factureindex, 1);

        await Facture.findOneAndDelete({ armes: armes._id });

        let ff = NewUser.armes.findIndex((x) => x._id === armes._id);

        NewUser.armes.splice(ff, 1);

        armes.cedee = true;

        armes.user = user.id;

        ced.valider = false;

        let dataa = {};

        dataa.name = user.nom;

        dataa.prenom = user.prenom;

        dataa.email = user.email;

        dataa.SIA = user.SIA;

        dataa.telephone = user.telephone;

        dataa.adresse = user.adresse;

        dataa.codepostal = user.codepostal;

        dataa.ville = user.ville;

        dataa.identifiant = user.identifiant;

        let da = armes.garantie;

        let ffd = armes.extension * 7889400000;

        let dateGaranti = Number(da) + Number(ffd);

        let dateGarantie = new Date(dateGaranti).toDateString();

        let m = new Date(dateGarantie).getMonth();

        let fff = m + 1;

        if (fff < 10) {
          fff = "0" + fff;
        }

        let j = new Date(dateGarantie).getDate();

        if (j < 10) {
          j = "0" + j;
        }

        let an = new Date(dateGarantie).getFullYear();

        let date = `${j}/${fff}/${an}`;

        let dateB = date.toString();

        dataa.garantie = dateB;

        dataa.extGarantie = new Date(
          Number(armes.garantie)
        ).toLocaleDateString();

        dataa.munitions = armes.quantite;

        dataa.serie = armes.serie;

        dataa.calibre = armes.calibre;

        dataa.categories = armes.modele;

        dataa.marque =
          armes.marques === "SMITHWESSON" ? "SMITH & WESSON" : "CZ";

        dataa.type = armes.type;

        dataa.armurier = armes.armurier;

        dataa.dateAchat = armes.dateAchat;

        dataa.cumul = armes.extension;

        dataa.date = dateB;

        let browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"],
        });

        let page = await browser.newPage();

        let content = await compile("template", dataa);

        let dd = new Date(Date.now()).getTime();

        await page.setContent(content);

        await page.emulateMediaType("screen");

        await page.pdf({
          format: "A4",
          path: path.join(process.cwd() + "/PDF", `${dd}${user._id}.pdf`),
          printBackground: true,
        });

        await browser.close();

        let fac = {};

        fac.user = req.user.id;

        fac.armes = armes._id;
        fac.serie = armes.serie;
        fac.modele = armes.modele;
        fac.marques = armes.marques;
        fac.type = armes.type;
        fac.nombre = armes.quantite;
        fac.munitions = armes.quantite;
        fac.valider = true;
        fac.dateCreation = Date.now();

        fac.fileName = `${dd}${user._id}`;

        fac.file = `/PDF/${dd}${user._id}.pdf`;

        fac.dateCreation = new Date(Date.now()).getTime();

        let factu = new Facture(fac);

        user.factures.unshift(factu);

        ced.valider = true;

        let f = user.armes.findIndex((x) => x === armes.id);

        user.armes.splice(f, 1);

        let d = user.ceder.findIndex((x) => x === ced._id);

        user.ceder.splice(d, 1);

        if (user.autorisation) {
          await transporter.sendMail({
            from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
            to: user.email,
            subject: "TRANSFERT EN COURS DE VALIDATION",
            text: `Transfert en cours de validation`,
            html: `<div>
      
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre arme est de nouveau en cours de transfert :</li>
            <ul>
                <li>${armes.marques}</li>
                <li> ${armes.modele}</li>
                <li> ${armes.calibre}</li>
                <li> ${armes.type}</li>
                <li> ${armes.serie}</li>
            </ul>
        </ul></br>
        <p>Destinataire : ${NewUser.nom} (email: ${NewUser.email})</p>
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
          user.armes.unshift(armes._id);

          ced.valider = false;

          await NewUser.save();
          await armes.save();
          await user.save();
          await factu.save();
          await ced.save();

          res.json({ msg: "ok" });
        } else {
          user.armes.unshift(armes._id);

          ced.valider = false;

          await NewUser.save();
          await armes.save();
          await user.save();
          await factu.save();
          await ced.save();

          res.json({ msg: "ok" });
        }
      }
    } else {
      await armes.save();
      await user.save();
      await Ceder.remove();
      res.json({ msg: "ok" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/cederbis/:id", auth, async (req, res) => {
  try {
    let ced = await Ceder.findById(req.params.id);

    let user = await User.findById(ced.from);

    let newUser = await User.findById(ced.to);

    let armes = await Arme.findById(ced.armes);

    if (armes) {
      if (newUser.email === user.email) {
        let f = user.ceder.findIndex((x) => x === ced._id);
        user.ceder.splice(f, 1);
        armes.cedee = false;
        ced.valider = false;
        armes.valider = false;
        await user.save();
        await ced.remove();
        await armes.save();

        if (user.autorisation) {
          await transporter.sendMail({
            from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
            to: user.email,
            subject: "TRANSFERT REFUSÉ",
            text: `Transfert refusé`,
            html: `<div>
         
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre demande de transfert a été refusée pour l'arme :</li>
            <ul>
                <li>${armes.marques}</li>
                <li> ${armes.modele}</li>
                <li> ${armes.calibre}</li>
                <li> ${armes.type}</li>
                <li> ${armes.serie}</li>
            </ul>
        </ul><br> <p>Cordialement, </p> </br>
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
          res.json({ msg: "ok" });
        } else {
          res.json({ msg: "ok" });
        }
      } else {
        let f = user.ceder.findIndex((x) => x === ced._id);

        user.ceder.splice(f, 1);

        armes.cedee = false;

        armes.user = user.id;

        ced.valider = false;

        armes.valider = false;

        if (user.autorisation) {
          await transporter.sendMail({
            from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
            to: user.email,
            subject: "TRANSFERT REFUSÉ",
            text: `Transfert refusé`,
            html: `<div>
         
        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
        <ul>
            <li>Votre demande de transfert a été refusée pour l'arme :</li>
            <ul>
                <li>${armes.marques}</li>
                <li> ${armes.modele}</li>
                <li> ${armes.calibre}</li>
                <li> ${armes.type}</li>
                <li> ${armes.serie}</li>
            </ul>
        </ul><br> <p>Cordialement, </p> </br>
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

          await armes.save();
          await ced.remove();
          await user.save();
          res.json({ msg: "ok" });
        } else {
          await armes.save();
          await ced.remove();
          await user.save();
          res.json({ msg: "ok" });
        }
      }
    } else {
      await ced.remove();
      await user.save();
      res.json({ msg: "ok" });
    }
  } catch (err) {
    console.log(err);
    res.send("SERVOR ERROR");
  }
});

router.get("/factures/:id", auth, async (req, res) => {
  try {
    let facture = await User.findById(req.params.id).populate("factures");
    res.json(facture);
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

router.delete("/factureBis/:id", auth, async (req, res) => {
  try {
    let facture = await Facture.findById(req.params.id);

    let arme = await Arme.findById(facture.armes);

    arme.quantite = 0;

    arme.pourcentage = 0;

    arme.extension = 0;

    facture.valider = false;

    let user = await User.findById(facture.user);

    await transporter.sendMail({
      from: `Extension Garantie<${process.env.EMAIL_ADMIN}> `,
      to: user.email,
      subject: "Extension de garantie refusé",
      text: `Extension de garantie refusé`,
      html: `<div>

        <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
          <ul>
            <li>Votre demande de transfert a été refusée pour l'arme :</li>
            <ul>
              <li>${arme.marques}</li>
              <li> ${arme.modele}</li>
              <li> ${arme.calibre}</li>
              <li> ${arme.type}</li>
              <li> ${arme.serie}</li>
            </ul>
          </ul>
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

    await arme.save();
    await user.save();
    await facture.save();

    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERROR");
  }
});

router.delete("/factures/:id", auth, async (req, res) => {
  try {
    let facture = await Facture.findById(req.params.id);

    if (!facture) {
      res.json({ msg: "ok" });
    }

    let arme = await Arme.findById(facture.armes);

    if (!arme) {
      await facture.remove();
      res.json({ msg: "ok" });
    }

    let user = await User.findById(facture.user).select(
      "-motdepasse -mdpsecret"
    );

    if (!facture) {
      let d = user.factures.findIndex((x) => x === req.params.id);
      user.factures.splice(d, 1);
      await user.save();
      res.json(user);
    } else {
      if (arme) {
        let ddd = new Date(arme.dateAchat);

        let m = new Date(ddd).getMonth() + 1;

        let j = new Date(ddd).getDate();

        let a = new Date(ddd).getFullYear();

        if (m < 10) {
          m = "0" + m;
        }

        if (j < 10) {
          j = "0" + j;
        }

        let dateBC = `${j}/${m}/${a}`;

        await Munition.deleteMany({ _id: { $in: facture.munitionsType } });

        arme.munitions.length = 0;

        arme.quantite = 0;

        arme.pourcentage = 0;

        arme.extension = 0;

        let user = await User.findById(facture.user);

        let d = user.factures.findIndex((x) => x === req.params.id);

        user.factures.splice(d, 1);

        await transporter.sendMail({
          from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
          to: user.email,
          subject: "Garantie Sidam refusée",
          text: `Extension de garantie refusée pour arme ${arme.serie}`,
          html: `<div>
         <p>Le ${dateBB} à Vauvert,<br></br><br>Bonjour ${user.nom} ${user.prenom},<br></br> Votre extension de garantie SIDAM pour arme ${arme.marques} ${arme.type} ${arme.modele} ${arme.calibre} ${arme.serie} achetée le ${dateBC} chez ${arme.armurier} a été refusée.<br><br><br></br>
         <div>

         <br> <p>Cordialement, </p> </br>
 
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

        await arme.save();

        await facture.remove();

        await user.save();

        res.json(user);
      } else {
        let d = user.factures.findIndex((x) => x === facture._id);

        user.factures.splice(d, 1);

        await transporter.sendMail({
          from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
          to: user.email,
          subject: "Garantie Sidam refusée",
          text: `Extension de garantie refusée`,
          html: `<div><p>Le ${dateBB} à Vauvert,<br></br><br>Bonjour ${user.nom} ${user.prenom},<br></br> Votre extension de garantie SIDAM a été refusée.<br>
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
        await facture.remove();
        res.json({ msg: "ok" });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/facture/:id", auth, async (req, res) => {
  try {
    let facture = await Facture.findById(req.params.id);

    let user = await User.findById(facture.user);

    let arme = await Arme.find({ _id: facture.armes });

    if (arme) {
      facture.valider = true;

      arme.pourcentage = arme.pourcentage;

      arme.extension = 0;

      arme.quantite = 0;

      await Munition.deleteMany({ _id: { $in: facture.munitionsType } });

      arme.munitions.length = 0;

      let ddd = new Date(arme.dateAchat);

      let m = new Date(ddd).getMonth() + 1;

      let j = new Date(ddd).getDate();

      let a = new Date(ddd).getFullYear();

      if (m < 10) {
        m = "0" + m;
      }

      if (j < 10) {
        j = "0" + j;
      }

      let dateBC = `${j}/${m}/${a}`;

      let gg = Date.now();

      let moiss = new Date(gg).getMonth() + 1;

      let annn = new Date(gg).getFullYear();

      let jourss = new Date(gg).getDate();

      if (moiss < 10) {
        moiss = "0" + moiss;
      }

      if (jourss < 10) {
        jourss = "0" + jourss;
      }

      let dateBB = `${jourss}/${moiss}/${annn}`;

      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: user.email,
        attachments: [
          {
            contentType: "application/pdf",
            filename: `${user.prenom}EXTENSIONGARANTIE.pdf`,
            path: `${process.env.API_URL}/PDF/${facture.fileName}.pdf`,
          },
        ],
        subject: "Garantie Sidam",
        text: `Extension de garantie ${user.nom} ${user.prenom} pour arme ${arme.serie}`,
        html: `<div>
       <p>Le ${dateBB} à Vauvert,<br></br><br>Bonjour ${user.nom} ${user.prenom},<br></br> Veuillez trouver ci-joint votre extension de garantie SIDAM pour arme ${arme.marques} ${arme.modele} ${arme.type} ${arme.serie} achetée le ${dateBC} chez ${arme.armurier}.<br> 
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

      await arme.save();

      await facture.save();

      res.json({ msg: "ok" });
    } else {
      let d = user.factures.findIndex((x) => x == facture._id);
      user.factures.splice(d, 1);
      await user.save();
      await facture.remove();
      res.json({ msg: "ok" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERROR");
  }
});

router.delete("/users/:id", auth, async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    await Arme.deleteMany({ user: user._id });

    await Ceder.deleteMany({ user: user._id });

    await Munition.deleteMany({ user: user._id });

    await Facture.deleteMany({ user: user._id });

    await user.remove();

    res.json({ msg: "ok" });
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

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
    check("admin", "Admin obligatoire").not().isEmpty(),
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
      admin,
    } = req.body;

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    }

    try {
      let user = await User.findOne({ email });
      let userb = await User.findOne({ SIA });

      if (user) {
        res.status(400).json("Email utilisee");
      } else if (userb) {
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
        d.admin = admin;

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

        let payload = {
          user: {
            id: user.id,
          },
        };

        await transporter.sendMail({
          from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
          to: user.email,
          subject: "VOTRE ESPACE PERSONNEL EST CREE",
          html: `    
    <div>
    <p>Bonjour ${user.nom} ${user.prenom}, <br></br>Vous compte personnel est créé. Vous allez pouvoir bénéficier
        d’extension de garantie sur vos nouvelles armes CZ et SMITH & WESSON.
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
</div>
    `,
        });

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
      console.log(err.message);
      res.send("SERVEUR ERREUR");
    }
  }
);

router.post("/armesGarantie/:id", auth, async (req, res) => {
  let { date } = req.body;
  try {
    let d = new Date(date).getTime();

    let arme = await Arme.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      { $set: { garantie: Number(d) } },
      { new: true }
    );

    await arme.save();
    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/armesButoire/:id", auth, async (req, res) => {
  let { dateBis } = req.body;
  try {
    let d = new Date(dateBis).getTime();

    let arme = await Arme.findOne({ _id: req.params.id });
    arme.limitDate = d;

    await arme.save();
    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/email", auth, async (req, res) => {
  let { email, sujet, text } = req.body;
  try {
    let user = await User.find({ email: email });

    for (let i = 0; i < user.length; i++) {
      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: user[i].email,
        subject: `${sujet}`,
        html: ` <div>
       
        <p>Bonjour ${user[i].prenom} ${user[i].nom}, <br></br>${text}<br>
            Vous remerciant de l’intérêt porté envers les marques Sellier & Bellot, Magtech, Smith & Wesson et CZ.<br><br></br>
            <div style="width: 100%;justify-content: space-around;display: flex;flex-direction: row;">
            </div> <br> <p>Cordialement, </p> </br>
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
    }

    res.json({ msg: "ok" });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/exportCSV", auth, async (req, res) => {
  try {
    await User.find({}, function (err, FoundObject) {
      FoundObject.forEach(async (meme) => {
        await User.updateMany(
          { _id: meme._id },
          {
            $set: {
              nombreArmes: meme.armes.length,
              nombredeCertificat: meme.factures.length,
              nombredeCeder: meme.ceder.length,
            },
          }
        );
      });
    }).then(async () => {
      await mongodb.connect(
        db,
        { useNewUrlParser: true, useUnifiedTopology: true },
        (err, client) => {
          if (err) throw err;

          let fileName = "Users";

          client
            .db("sidam")
            .collection("users")
            //.find({ autorisation: true })
            .find()
            .toArray(async (err, data) => {
              if (err) throw err;
              fastcsv
                .write(data, {
                  headers: [
                    "identifiant",
                    "nom",
                    "prenom",
                    "email",
                    "telephone",
                    "adresse",
                    "codepostal",
                    "ville",
                    "SIA",
                    "dateCreation",
                    "dateModification",
                    "marque",
                    "type",
                    "nombreArmes",
                    "nombredeCertificat",
                    "nombredeCeder",
                  ],
                  delimiter: ";",
                })
                .on("finish", function () {
                  console.log("Write to mycsv.csv successfully!");
                })
                .pipe(
                  fs.createWriteStream(path.resolve("PDF", `${fileName}.csv`), {
                    encoding: "utf-16le",
                  })
                );

              client.close();
              res.json(`${fileName}.csv`);
            });
        }
      );
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/exportCSVBis/:id", auth, async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    await User.findByIdAndUpdate(req.params.id, {
      $set: {
        nombreArmes: user.armes.length,
        nombredeCertificat: user.factures.length,
        nombredeCeder: user.ceder.length,
      },
    });

    let fileName = `${user.prenom}${user.nom}`;

    let d = [];

    d.push(user);

    //if (user.autorisation) {
    await fastcsv
      .write(d, {
        headers: [
          "identifiant",
          "nom",
          "prenom",
          "email",
          "telephone",
          "adresse",
          "codepostal",
          "ville",
          "SIA",
          "dateCreation",
          "dateModification",
          "marque",
          "type",
          "nombreArmes",
          "nombredeCertificat",
          "nombredeCeder",
        ],
        delimiter: ";",
      })
      .on("finish", function () {
        console.log("Write to mycsv.csv successfully!");
      })
      .pipe(
        fs.createWriteStream(path.resolve("PDF", `${fileName}.csv`), {
          encoding: "utf-16le",
        })
      );
    res.json(`${fileName}.csv`);
    //} else {
    //res.json(`${fileName}.csv`);
    //}
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/exportCSVWBis/:id", auth, async (req, res) => {
  try {
    let arme = await Arme.findById(req.params.id);
    let user = await User.findById(arme.user);

    await Arme.findByIdAndUpdate(req.params.id, {
      $set: {
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        SIA: user.SIA,
      },
    });

    let fileName = `${arme.marques}${user.nom}${arme._id}}`;

    let d = [];

    d.push(arme);

    if (user.autorisation) {
      await fastcsv
        .write(d, {
          headers: [
            "marques",
            "modele",
            "calibre",
            "dateAchat",
            "type",
            "serie",
            "extension",
            "quantite",
            "garantieActuelle",
            "cedee",
            "prenom",
            "nom",
            "email",
            "SIA",
          ],
          delimiter: ";",
        })
        .on("finish", function () {
          console.log("Write to mycsv.csv successfully!");
        })
        .pipe(
          fs.createWriteStream(path.resolve("PDF", `${fileName}.csv`), {
            encoding: "utf-16le",
          })
        );
      res.json(`${fileName}.csv`);
    } else {
      res.json(`${fileName}.csv`);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

router.post("/exportCSVW", auth, async (req, res) => {
  try {
    await User.find({}, function (err, FoundObject) {
      FoundObject.forEach(async (meme) => {
        await Arme.updateMany(
          { user: meme._id },
          {
            $set: {
              prenom: meme.prenom,
              nom: meme.nom,
              email: meme.email,
              SIA: meme.SIA,
            },
          }
        );
      });
    }).then(async () => {
      await mongodb.connect(
        db,
        { useNewUrlParser: true, useUnifiedTopology: true },
        (err, client) => {
          if (err) throw err;

          let fileName = "Armes";

          client
            .db("sidam")
            .collection("armes")
            .find()
            .toArray(async (err, data) => {
              if (err) throw err;
              fastcsv
                .write(data, {
                  headers: [
                    "marques",
                    "modele",
                    "calibre",
                    "dateAchat",
                    "type",
                    "serie",
                    "extension",
                    "quantite",
                    "garantieActuelle",
                    "cedee",
                    "prenom",
                    "nom",
                    "email",
                    "SIA",
                  ],
                  delimiter: ";",
                })
                .on("finish", function () {
                  console.log("Write to mycsv.csv successfully!");
                })
                .pipe(
                  fs.createWriteStream(path.resolve("PDF", `${fileName}.csv`), {
                    encoding: "utf-16le",
                  })
                );

              client.close();
              res.json(`${fileName}.csv`);
            });
        }
      );
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVEUR ERREUR");
  }
});

module.exports = router;
