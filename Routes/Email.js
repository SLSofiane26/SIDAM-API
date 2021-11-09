let express = require('express');
let router = express.Router();
let auth = require('../Middleware/Auth');
let User = require('../Models/User');
let transporter = require('../Routes/Nodemailer.js');
require('dotenv').config();

router.post('/email', async (req, res) => {
  let { text, sujet, email, nom, prenom } = req.body;

  try {
    let user = await User.findOne({ email: email });

    await transporter.sendMail({
      from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
      to: `${process.env.EMAIL_ADMIN}`,
      subject: `${sujet}`,
      html: `<div>
        <p> Nouveau message : ${sujet} </p> <br></br>
        <ul style="list-style: none;">
            <li>Message recu de ${nom} ${prenom}</li>
            <li>
                <p>${text}</p>
            </li>
            <li>
                <p>Email : ${email}</p>
            </li>
        </ul>
        </ul>
        <br><p>Cordialement, </p></br>
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
                <span style="color: blue;font-size:x-small;">

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

    if (user.autorisation) {
      await transporter.sendMail({
        from: `Extension Garantie <${process.env.EMAIL_ADMIN}>`,
        to: email,
        subject: 'DEMANDE D’INFORMATION',
        html: `<div>
       
            <p>Bonjour ${nom} ${prenom}, <br></br>Nous vous remercions pour votre email. Notre équipe va revenir
                vers vous sous 48H afin de vous apporter une réponse.<br>
                Vous remerciant de l’intérêt porté envers les marques CZ, Smith & Wesson, Sellier & Bellot, Magtech.<br><br><br> <p>Cordialement, </p></br>
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
      res.json({ msg: 'Email envoyée' });
    } else {
      res.json({ msg: 'Email envoyée' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('SERVOR ERRROR');
  }
});

module.exports = router;
