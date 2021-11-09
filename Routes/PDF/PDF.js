let express = require("express");
let router = express.Router();
let puppeteer = require("puppeteer");
let handlebars = require("handlebars");
let User = require("../../Models/User");
let auth = require("../../Middleware/Auth");
let fs = require("fs");
let path = require("path");
let Facture = require("../../Models/Factures");
let Armes = require("../../Models/Armes");
let transporter = require("../Nodemailer.js");

let g = Date.now();

let mois = new Date(g).getMonth() + 1;

let ann = new Date(g).getFullYear();

let jours = new Date(g).getDate();

if (mois < 10) {
  mois = "0" + mois;
}

if (jours < 10) {
  jours = "0" + jours;
}

let dateB = `${jours}/${mois}/${ann}`;

require("dotenv").config();

let compile = async (templateName, data) => {
  let filePath = path.join(process.cwd(), "Routes/PDF", `${templateName}.hbs`);
  let html = fs.readFileSync(filePath, "utf-8", (err, succes) => {
    if (err) {
      throw err;
    }
  });
  return handlebars.compile(html)(data);
};

router.post("/pdfbis", auth, async (req, res) => {
  let { file } = req.body;
  try {
    let user = await User.findById(req.user.id).select(
      "-motdepasse -mdpsecret"
    );

    let facture = await Facture.findOne({ file: file });

    let arme = await Arme.findOne({ _id: facture.armes });

    if (user.autorisation) {
      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: user.email,
        attachments: [
          {
            contentType: "application/pdf",
            filename: `${user.prenom}EXTENSIONGARANTIE.pdf`,
            path: `${process.env.API_URL}${String(file).trim()}`,
          },
        ],
        subject: "GARANTIE SIDAM",
        html: `<div>
    
      <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
      <ul>
          <li>Suite à votre demande de votre certificat de garantie : <br></br></li>
          <ul>
              <li>${arme.marques}</li>
              <li>${arme.modele}</li>
              <li>${arme.calibre}</li>
              <li>${arme.type}</li>
              <li>${arme.serie}</li>
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
      res.json(user);
    } else {
      res.json(user);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.post("/pdf", auth, async (req, res) => {
  try {
    let data = {};

    let user = await User.findById(req.user.id);

    data.name = user.nom;

    data.prenom = user.prenom;

    data.email = user.email;

    data.SIA = user.SIA;

    data.telephone = user.telephone;

    data.adresse = user.adresse;

    data.codepostal = user.codepostal;

    data.ville = user.ville;

    data.identifiant = user.identifiant;

    data.garantie = new Date(req.body.ext).toLocaleDateString();

    req.body.data.map((items, index) => {
      data.extGarantie = new Date(items.dateAchat).toLocaleDateString();
      data.munitions = items.quantite;
      data.serie = items.serie;
      data.calibre = items.calibre;
      data.modele = items.modele;
      data.type = items.type;
      data.armurier = items.armurier;
      data.dateAchat = items.dateAchat;
      data.marque = items.marques;
    });

    data.cumul = req.body.extBis;

    data.date = dateB;

    let browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
      printBackground: true,
    });

    let page = await browser.newPage();

    let content = await compile("template", data);

    let d = new Date(Date.now()).getTime();

    await page.setContent(content);

    await page.emulateMediaType("screen");

    await page.pdf({
      format: "A4",
      path: `./PDF/${d}${user.prenom}.pdf`,
    });

    await browser.close();

    let fac = {};

    fac.user = req.user.id;

    let armes = await Armes.findById(req.body.arme);

    fac.armes = req.body.arme;
    fac.serie = armes.serie;
    fac.model = armes.categories;

    fac.fileName = `${d}${user.prenom}`;

    fac.file = `/PDF/${d}${user.prenom}.pdf`;

    fac.dateCreation = new Date(Date.now()).getTime();

    let factu = new Facture(fac);

    user.factures.unshift(factu);

    let dd = new Date(data.dateAchat);

    let m = new Date(dd).getMonth() + 1;

    let j = new Date(dd).getDate();

    let a = new Date(dd).getFullYear();

    if (m < 10) {
      m = "0" + m;
    }

    if (j < 10) {
      j = "0" + j;
    }

    let dateBC = `${j}/${m}/${a}`;

    if (user.autorisation) {
      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: user.email,
        attachments: [
          {
            filename: `${user.prenom}EXTENSIONGARANTIE.pdf`,
            path: `${process.env.API_URL}/PDF/${d}${user.prenom}.pdf`,
            contentType: "application/pdf",
          },
        ],
        subject: "GARANTIE SIDAM",
        html: `<div>

      <p>Bonjour ${user.prenom} ${user.nom}, <br></br>
      <ul>
          <li>Veuillez trouver ci-joint votre nouveau certificat de garantie de l'arme :</li>
          <ul>
              <li>${data.marque}</li>
              <li> ${data.modele}</li>
              <li> ${data.calibre}</li>
              <li> ${data.type}</li>
              <li> ${data.serie}</li>
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
                  quelconque de ses filiales</span>.<span style="color: red;font-weight: bold;font-size: small;"> La
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
                  style="color: red;font-weight: bold;font-size: small;"> Unauthorized
                  publication, use, dissemination, forwarding, printing or copying of this email and its associated
                  attachments is strictly prohibited.</span>
          </p>
      </div>
  </div>`,
      });
      await factu.save();
      await user.save();

      res.json(factu);
    } else {
      await factu.save();
      await user.save();

      res.json(factu);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("SERVOR ERROR");
  }
});

router.get("/factures", auth, async (req, res) => {
  try {
    let users = await User.findById(req.user.id)
      .populate("factures")
      .select("-motdepasse -mdpsecret");

    res.json(users);
  } catch (err) {
    res.status(500);
  }
});

router.delete("/factures/:id", auth, async (req, res) => {
  try {
    let facture = await Facture.findById(req.params.id);

    let arme = await Arme.findById(facture.armes);

    let user = await User.findById(req.user.id).select(
      "-motdepasse -mdpsecret"
    );

    if (!facture) {
      let d = user.factures.findIndex((x) => (x = req.params.id));

      user.factures.splice(d, 1);

      await user.save();

      res.json(user);
    } else {
      if (arme) {
        let user = await User.findById(facture.user);

        let d = user.factures.findIndex((x) => (x = req.params.id));

        user.factures.splice(d, 1);

        await arme.save();

        await facture.remove();

        await user.save();

        res.json(user);
      } else {
        let d = user.factures.findIndex((x) => (x = facture._id));

        user.factures.splice(d, 1);

        await user.save();
        await facture.remove();
        res.json({ msg: "ok" });
      }
    }
  } catch (err) {
    res.status(500).send("SERVOR ERROR");
  }
});

module.exports = router;
