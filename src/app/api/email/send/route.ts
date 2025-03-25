import { NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import nodemailer from "nodemailer";
import CryptoJS from "crypto-js";

const decryptPassword = (encryptedPassword: string) => {
  try {
    const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "default-key";
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Erreur lors du décryptage:", error);
    throw new Error("Erreur lors du décryptage du mot de passe");
  }
};

export async function POST(request: Request) {
  try {
    const { to, subject, content, userId, emailId, isHtml, files, accountId } =
      await request.json();
    console.log("1. Données reçues:", {
      to,
      subject,
      userId,
      emailId,
      isHtml,
      hasFiles: !!files,
      accountId,
    });

    // Vérifier les paramètres requis
    if (!to || !subject || !content || !userId || !emailId || !accountId) {
      console.log("2. Paramètres manquants:", {
        to,
        subject,
        userId,
        emailId,
        accountId,
      });
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Récupérer les paramètres du compte email spécifique
    console.log(
      "3. Tentative de récupération des paramètres du compte email:",
      accountId
    );
    const emailAccountSnap = await adminDb
      .collection("emailAccounts")
      .doc(accountId)
      .get();

    if (!emailAccountSnap.exists) {
      console.log("4. Compte email non trouvé:", accountId);
      return NextResponse.json(
        { error: "Compte email non trouvé" },
        { status: 404 }
      );
    }

    const emailAccount = emailAccountSnap.data();
    console.log("5. Compte email récupéré:", {
      hasPassword: !!emailAccount?.password,
      hasSmtp: !!emailAccount?.smtpServer,
      smtpConfig: {
        server: emailAccount?.smtpServer,
        port: emailAccount?.smtpPort,
      },
    });

    // Vérifier la structure des données
    if (!emailAccount?.password) {
      console.log("6. Mot de passe manquant");
      return NextResponse.json(
        { error: "Mot de passe manquant dans la configuration" },
        { status: 400 }
      );
    }

    if (!emailAccount.smtpServer) {
      console.log("7. Configuration SMTP manquante");
      return NextResponse.json(
        { error: "Configuration SMTP manquante" },
        { status: 400 }
      );
    }

    try {
      const decryptedPassword = decryptPassword(emailAccount.password);
      console.log("8. Mot de passe décrypté avec succès");

      // Créer le transporteur SMTP
      const transportConfig = {
        host: emailAccount.smtpServer,
        port: emailAccount.smtpPort,
        secure: emailAccount.useSSL,
        auth: {
          user: emailAccount.email,
          pass: decryptedPassword,
        },
      };
      console.log("9. Configuration du transporteur:", {
        host: transportConfig.host,
        port: transportConfig.port,
        secure: transportConfig.secure,
        auth: { user: transportConfig.auth.user },
      });

      const transporter = nodemailer.createTransport(transportConfig);

      // Vérifier la connexion SMTP
      console.log("10. Vérification de la connexion SMTP");
      await transporter.verify();
      console.log("11. Connexion SMTP vérifiée avec succès");

      // Préparer les options d'email
      const mailOptions = {
        from: emailAccount.email,
        to,
        subject,
        text: !isHtml ? content : undefined,
        html: isHtml ? content : undefined,
        attachments: files?.map((file: any) => ({
          filename: file.name,
          content: file.content,
          contentType: file.type,
        })),
      };

      console.log("12. Tentative d'envoi de l'email avec les options:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        isHtml,
        hasAttachments: !!mailOptions.attachments?.length,
      });

      await transporter.sendMail(mailOptions);
      console.log("13. Email envoyé avec succès");

      // Mettre à jour le statut de l'email dans Firestore
      console.log("14. Mise à jour du statut de l'email:", emailId);
      await adminDb.collection("emails").doc(emailId).update({
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      console.log("15. Statut de l'email mis à jour avec succès");

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Erreur détaillée:", error);
      throw error;
    }
  } catch (error) {
    console.error("Erreur détaillée lors de l'envoi de l'email:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'envoi de l'email",
        details: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    );
  }
}
