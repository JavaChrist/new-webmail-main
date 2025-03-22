import { NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { adminApp, adminDb } from "@/config/firebase-admin";
import CryptoJS from "crypto-js";
import { doc, getDoc } from "firebase/firestore";

const decryptPassword = (encryptedPassword: string) => {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("Clé de chiffrement non définie");
    }

    const bytes = CryptoJS.AES.decrypt(
      encryptedPassword,
      process.env.ENCRYPTION_KEY
    );
    const result = bytes.toString(CryptoJS.enc.Utf8);

    if (!result) {
      throw new Error("Le déchiffrement a échoué");
    }

    return result;
  } catch (error) {
    console.error("Erreur lors du décryptage:", error);
    throw new Error(
      `Erreur lors du décryptage du mot de passe: ${error.message}`
    );
  }
};

// Fonction pour nettoyer les données avant sauvegarde Firestore
const cleanEmailData = (email: any) => {
  const cleanData = {
    messageId: email.messageId || "",
    from: email.from || "",
    to: email.to || "",
    subject: email.subject || "",
    content: email.content || "",
    timestamp: email.timestamp || new Date(),
    read: false,
    starred: false,
    folder: "inbox",
    userId: email.userId,
    attachments:
      email.attachments?.map((att: any) => ({
        filename: att.filename || "",
        contentType: att.contentType || "",
        size: att.size || 0,
        content: att.content || "",
      })) || [],
  };

  // Supprimer toutes les propriétés undefined ou null
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined || cleanData[key] === null) {
      delete cleanData[key];
    }
  });

  return cleanData;
};

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      throw new Error("UserId manquant");
    }

    const emailConfigDoc = await adminDb
      .collection("emailConfigs")
      .doc(userId)
      .get();

    if (!emailConfigDoc.exists) {
      throw new Error("Configuration email non trouvée");
    }

    const emailConfig = emailConfigDoc.data();
    const decryptedPassword = decryptPassword(emailConfig.password);

    if (!decryptedPassword) {
      throw new Error("Échec du décryptage du mot de passe");
    }

    const imapConfig = {
      user: emailConfig.email,
      password: decryptedPassword,
      host: emailConfig.imapHost,
      port: emailConfig.imapPort,
      tls: emailConfig.imapSecure,
      tlsOptions: { rejectUnauthorized: false },
    };

    // Fonction pour récupérer les emails
    const fetchEmails = () => {
      return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);
        const emails: any[] = [];

        imap.once("ready", () => {
          imap.openBox("INBOX", false, (err, box) => {
            if (err) {
              imap.end();
              reject(err);
              return;
            }

            const date = new Date();
            date.setDate(date.getDate() - 30); // Derniers 30 jours

            imap.search(["ALL", ["SINCE", date]], (err, results) => {
              if (err) {
                imap.end();
                reject(err);
                return;
              }

              if (!results || results.length === 0) {
                imap.end();
                resolve([]);
                return;
              }

              const fetch = imap.fetch(results, {
                bodies: "",
                struct: true,
              });

              fetch.on("message", (msg) => {
                msg.on("body", (stream) => {
                  simpleParser(stream).then(
                    (parsed) => {
                      const email = {
                        messageId: parsed.messageId,
                        from: parsed.from?.text,
                        to: parsed.to?.text,
                        subject: parsed.subject,
                        content:
                          parsed.html || parsed.textAsHtml || parsed.text,
                        timestamp: parsed.date,
                        flags: msg.flags,
                      };
                      emails.push(email);
                    },
                    (error) => {
                      console.error(
                        "Erreur lors du traitement d'un email:",
                        error
                      );
                    }
                  );
                });
              });

              fetch.once("error", (err) => {
                console.error("Erreur lors de la récupération:", err);
                imap.end();
                reject(err);
              });

              fetch.once("end", () => {
                imap.end();
                resolve(emails);
              });
            });
          });
        });

        imap.once("error", (err) => {
          console.error("Erreur IMAP:", err);
          reject(err);
        });

        imap.connect();
      });
    };

    const emails = await fetchEmails();
    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error("Erreur lors de la synchronisation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
