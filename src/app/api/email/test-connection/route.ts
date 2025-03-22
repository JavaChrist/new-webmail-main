import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import Imap from "imap";

export const runtime = "nodejs"; // Forcer l'utilisation de Node.js au lieu de Edge

export async function POST(request: Request) {
  try {
    const { host, port, secure, user, pass } = await request.json();

    // Test de la connexion IMAP
    const imapConfig = {
      user,
      password: pass,
      host,
      port: Number(port),
      tls: Boolean(secure),
      tlsOptions: {
        rejectUnauthorized: false,
      },
    };

    const testImapConnection = () => {
      return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
          imap.end();
          resolve(true);
        });

        imap.once("error", (err) => {
          reject(new Error(`Erreur IMAP : ${err.message}`));
        });

        imap.connect();
      });
    };

    // Test de la connexion SMTP
    const smtpConfig = {
      host,
      port: Number(port),
      secure: Boolean(secure),
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    };

    try {
      // Tester SMTP
      const transporter = createTransport(smtpConfig);
      await transporter.verify();
      transporter.close();

      // Tester IMAP
      await testImapConnection();

      return NextResponse.json({
        success: true,
        message: "Connexion aux serveurs SMTP et IMAP réussie",
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Erreur de connexion : ${error.message}`
          : "Erreur de connexion aux serveurs de messagerie"
      );
    }
  } catch (error) {
    console.error("Erreur lors du test de connexion:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erreur de connexion aux serveurs de messagerie";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
