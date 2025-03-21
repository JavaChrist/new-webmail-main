import { NextResponse } from "next/server";
import Imap from "imap";
import { ParsedMail, simpleParser } from "mailparser";
import { adminApp, adminDb, adminAuth } from "@/config/firebase-admin";
import CryptoJS from "crypto-js";

const decryptPassword = (encryptedPassword: string) => {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      console.error(
        "ENCRYPTION_KEY n'est pas définie dans les variables d'environnement"
      );
      throw new Error("Clé de chiffrement non définie");
    }

    // Déchiffrement simple
    const bytes = CryptoJS.AES.decrypt(
      encryptedPassword,
      process.env.ENCRYPTION_KEY
    );
    const result = bytes.toString(CryptoJS.enc.Utf8);

    if (!result) {
      console.error("Le déchiffrement a produit une chaîne vide");
      throw new Error("Le déchiffrement a échoué");
    }

    return result;
  } catch (error) {
    console.error("Erreur lors du décryptage:", error);
    console.error(
      "Encrypted password (premiers caractères):",
      encryptedPassword.substring(0, 20)
    );
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
  console.log("🚀 Début de la requête de synchronisation");

  try {
    // Vérifier le token d'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: "Token d'authentification requis" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log("✅ Token vérifié pour userId:", decodedToken.uid);
    } catch (error) {
      console.error("❌ Erreur de vérification du token:", error);
      return NextResponse.json(
        { error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = body.userId;

    if (!userId || userId !== decodedToken.uid) {
      console.error("❌ UserId invalide ou ne correspond pas au token");
      return NextResponse.json({ error: "UserId invalide" }, { status: 400 });
    }

    console.log("📧 Récupération des paramètres email pour userId:", userId);
    const settingsDoc = await adminDb
      .collection("emailSettings")
      .doc(userId)
      .get();

    if (!settingsDoc.exists) {
      console.error("❌ Configuration email non trouvée pour userId:", userId);
      return NextResponse.json(
        { error: "Configuration email non trouvée" },
        { status: 404 }
      );
    }

    const settings = settingsDoc.data();
    if (!settings?.email || !settings?.password) {
      console.error("❌ Configuration email incomplète:", {
        hasEmail: !!settings?.email,
        hasPassword: !!settings?.password,
      });
      return NextResponse.json(
        { error: "Configuration email incomplète" },
        { status: 400 }
      );
    }

    console.log("🔐 Tentative de déchiffrement du mot de passe");
    const password = await decryptPassword(settings.password);
    console.log("✅ Mot de passe déchiffré avec succès");

    // Configuration IMAP
    const imapConfig = {
      user: settings.email,
      password: password,
      host: settings.imapHost || "imap.ionos.fr",
      port: settings.imapPort || 993,
      tls: settings.imapSecure ?? true,
      tlsOptions: { rejectUnauthorized: false },
    };

    console.log("📨 Configuration IMAP:", {
      user: imapConfig.user,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.tls,
    });

    // Fonction pour récupérer les emails
    const fetchEmails = () => {
      return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);
        const emails: any[] = [];
        let completed = 0;
        let totalMessages = 0;

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

              totalMessages = results.length;
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
                        userId: userId,
                        read: false,
                        starred: false,
                        folder: "inbox",
                      };

                      emails.push(email);
                      completed++;

                      if (completed === totalMessages) {
                        imap.end();
                        resolve(emails);
                      }
                    },
                    (error) => {
                      console.error("Erreur parsing email:", error);
                      completed++;
                      if (completed === totalMessages) {
                        imap.end();
                        resolve(emails);
                      }
                    }
                  );
                });
              });

              fetch.once("error", (err) => {
                console.error("Erreur fetch:", err);
                imap.end();
                reject(err);
              });

              fetch.once("end", () => {
                if (completed === totalMessages) {
                  imap.end();
                  resolve(emails);
                }
              });
            });
          });
        });

        imap.once("error", (err) => {
          console.error("Erreur IMAP:", err);
          reject(err);
        });

        imap.once("end", () => {
          if (completed === totalMessages) {
            resolve(emails);
          }
        });

        imap.connect();
      });
    };

    // Récupérer les emails
    const emails = await fetchEmails();

    // Vérifier les emails existants
    const existingEmailsSnapshot = await adminDb
      .collection("emails")
      .where("userId", "==", userId)
      .get();

    const existingMessageIds = new Set(
      existingEmailsSnapshot.docs.map((doc) => doc.data().messageId)
    );

    // Filtrer les nouveaux emails
    const newEmails = emails.filter(
      (email) => !existingMessageIds.has(email.messageId)
    );

    // Sauvegarder les nouveaux emails
    if (newEmails.length > 0) {
      const batch = adminDb.batch();
      for (const email of newEmails) {
        const newEmailRef = adminDb.collection("emails").doc();
        batch.set(newEmailRef, email);
      }
      await batch.commit();
    }

    return NextResponse.json({
      message: `${newEmails.length} nouveaux emails synchronisés`,
      totalEmails: emails.length,
    });
  } catch (error) {
    console.error("❌ Erreur détaillée:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
