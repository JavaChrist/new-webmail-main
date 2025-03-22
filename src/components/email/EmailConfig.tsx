"use client";

import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { X, Save, RefreshCw } from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import CryptoJS from "crypto-js";

interface EmailConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailSettings {
  email: string;
  password: string;
  // Paramètres SMTP (envoi)
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  // Paramètres IMAP (réception)
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
}

const defaultIonosSettings = {
  smtpHost: "smtp.ionos.fr",
  smtpPort: 465,
  smtpSecure: true,
  imapHost: "imap.ionos.fr",
  imapPort: 993,
  imapSecure: true,
};

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

const encryptPassword = (password: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error("La clé de chiffrement n'est pas définie");
  }
  try {
    // Utiliser une approche plus simple sans format spécifique
    return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error("Erreur lors du chiffrement:", error);
    throw new Error("Le chiffrement a échoué");
  }
};

const decryptPassword = (encryptedPassword: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error("La clé de chiffrement n'est pas définie");
  }
  try {
    // Déchiffrement simple
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error("Le déchiffrement a produit une chaîne vide");
    }
    return result;
  } catch (error) {
    console.error("Erreur lors du décryptage:", error);
    throw new Error("Le déchiffrement a échoué");
  }
};

export default function EmailConfig({ isOpen, onClose }: EmailConfigProps) {
  const { isDarkMode } = useTheme();
  const [settings, setSettings] = useState<EmailSettings>({
    email: "",
    password: "",
    ...defaultIonosSettings,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!auth.currentUser) return;

      try {
        const settingsDoc = await getDoc(
          doc(db, "emailSettings", auth.currentUser.uid)
        );
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            email: data.email,
            password: decryptPassword(data.password),
            smtpHost:
              data.smtp?.host || data.smtpHost || defaultIonosSettings.smtpHost,
            smtpPort:
              data.smtp?.port || data.smtpPort || defaultIonosSettings.smtpPort,
            smtpSecure:
              data.smtp?.secure ??
              data.smtpSecure ??
              defaultIonosSettings.smtpSecure,
            imapHost:
              data.imap?.host || data.imapHost || defaultIonosSettings.imapHost,
            imapPort:
              data.imap?.port || data.imapPort || defaultIonosSettings.imapPort,
            imapSecure:
              data.imap?.secure ??
              data.imapSecure ??
              defaultIonosSettings.imapSecure,
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
        setError("Erreur lors du chargement des paramètres");
      }
    };

    if (isOpen) {
      loadSettings();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const testConnection = async () => {
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      // Tester la connexion SMTP
      const response = await fetch("/api/email/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure,
          user: settings.email,
          pass: settings.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Erreur de connexion au serveur de messagerie"
        );
      }

      setSuccess("Configuration du serveur de messagerie validée");
    } catch (error) {
      console.error("Erreur lors du test de connexion:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur de connexion au serveur de messagerie"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("Vous devez être connecté pour sauvegarder la configuration");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const userId = auth.currentUser.uid;
      const encryptedPassword = encryptPassword(settings.password);

      // Sauvegarder dans Firestore
      await setDoc(doc(db, "emailSettings", userId), {
        email: settings.email,
        password: encryptedPassword,
        smtpHost: settings.smtpHost,
        smtpPort: Number(settings.smtpPort),
        smtpSecure: Boolean(settings.smtpSecure),
        imapHost: settings.imapHost,
        imapPort: Number(settings.imapPort),
        imapSecure: Boolean(settings.imapSecure),
        updatedAt: new Date().toISOString(),
      });

      setSuccess("Configuration sauvegardée avec succès");

      // Tester la connexion après la sauvegarde
      await testConnection();

      // Fermer la modal si tout est OK
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la sauvegarde de la configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetToIonosDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      ...defaultIonosSettings,
    }));
    setError(null);
    setSuccess(null);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className={`w-full max-w-2xl p-6 rounded-lg shadow-xl ${
            isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-bold">
              Configuration du compte email
            </Dialog.Title>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-500">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Paramètres du compte</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block mb-1">Adresse email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white placeholder-gray-400"
                        : "bg-gray-50 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={settings.password}
                    onChange={(e) =>
                      setSettings({ ...settings, password: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white placeholder-gray-400"
                        : "bg-gray-50 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Paramètres SMTP (envoi)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Serveur SMTP</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) =>
                      setSettings({ ...settings, smtpHost: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-50 text-gray-900"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Port SMTP</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        smtpPort: parseInt(e.target.value),
                      })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-50 text-gray-900"
                    }`}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.smtpSecure}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpSecure: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span>Utiliser SSL/TLS</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Paramètres IMAP (réception)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Serveur IMAP</label>
                  <input
                    type="text"
                    value={settings.imapHost}
                    onChange={(e) =>
                      setSettings({ ...settings, imapHost: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-50 text-gray-900"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Port IMAP</label>
                  <input
                    type="number"
                    value={settings.imapPort}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        imapPort: parseInt(e.target.value),
                      })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-700 text-white"
                        : "bg-gray-50 text-gray-900"
                    }`}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.imapSecure}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          imapSecure: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span>Utiliser SSL/TLS</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4 mt-6">
              <button
                type="button"
                onClick={resetToIonosDefaults}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                <RefreshCw size={18} />
                Paramètres Ionos par défaut
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={isTesting}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white`}
                >
                  {isTesting ? "Test en cours..." : "Tester la connexion"}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-green-500 hover:bg-green-600"
                  } text-white`}
                >
                  <Save size={18} />
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
