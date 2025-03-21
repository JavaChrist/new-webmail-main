"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Search,
  Plus,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import { useRouter } from "next/navigation";
import ComposeModal from "@/components/email/ComposeModal";
import EmailView from "@/components/email/EmailView";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EmailConfig from "@/components/email/EmailConfig";
import * as Toast from "@radix-ui/react-toast";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "archive" | "trash";
  userId: string;
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
}

type Folder = "inbox" | "sent" | "archive" | "trash";

export default function EmailPage() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder>("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyData, setReplyData] = useState<{
    to: string;
    subject: string;
    content: string;
  } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        loadEmails();
        syncEmails();
        const syncInterval = setInterval(syncEmails, 5 * 60 * 1000);
        return () => clearInterval(syncInterval);
      }
    });

    return () => unsubscribe();
  }, [router, selectedFolder]);

  const loadEmails = async () => {
    if (!auth.currentUser) return;

    setIsLoading(true);
    try {
      const emailsRef = collection(db, "emails");
      const q = query(
        emailsRef,
        where("userId", "==", auth.currentUser.uid),
        where("folder", "==", selectedFolder),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const loadedEmails = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Email[];

      setEmails(loadedEmails);
    } catch (error) {
      console.error("Erreur lors du chargement des emails:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (emailData: {
    to: string;
    subject: string;
    content: string;
    attachments?: File[];
  }) => {
    if (!auth.currentUser) return;

    let emailRef;
    try {
      // Créer d'abord l'email dans Firestore
      emailRef = await addDoc(collection(db, "emails"), {
        from: auth.currentUser.email || "",
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        timestamp: Timestamp.now(),
        read: true,
        starred: false,
        folder: "sent" as Folder,
        userId: auth.currentUser.uid,
        status: "sending",
      });

      // Préparer les pièces jointes si présentes
      const files = emailData.attachments
        ? await Promise.all(
            emailData.attachments.map(async (file) => {
              const reader = new FileReader();
              return new Promise<{
                name: string;
                content: string;
                type: string;
              }>((resolve) => {
                reader.onloadend = () => {
                  resolve({
                    name: file.name,
                    content: reader.result as string,
                    type: file.type,
                  });
                };
                reader.readAsDataURL(file);
              });
            })
          )
        : undefined;

      // Envoyer l'email via l'API
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          content: emailData.content,
          userId: auth.currentUser.uid,
          emailId: emailRef.id,
          isHtml: true,
          files,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'envoi de l'email");
      }

      // Afficher le toast de succès
      setToastMessage("Email envoyé avec succès");
      setShowToast(true);

      // Mettre à jour la liste si on est dans le dossier envoyés
      if (selectedFolder === "sent") {
        await loadEmails();
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      // Mettre à jour le statut de l'email en cas d'erreur
      if (emailRef) {
        await updateDoc(doc(db, "emails", emailRef.id), {
          status: "error",
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
      throw error;
    }
  };

  const handleStarEmail = async (email: Email) => {
    try {
      const emailRef = doc(db, "emails", email.id);
      await updateDoc(emailRef, {
        starred: !email.starred,
      });
      setEmails(
        emails.map((e) =>
          e.id === email.id ? { ...e, starred: !e.starred } : e
        )
      );
    } catch (error) {
      console.error("Erreur lors du marquage comme favori:", error);
    }
  };

  const handleArchiveEmail = async (email: Email) => {
    try {
      const emailRef = doc(db, "emails", email.id);
      await updateDoc(emailRef, {
        folder: "archive",
      });
      setEmails(emails.filter((e) => e.id !== email.id));
      setSelectedEmail(null);
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
    }
  };

  const handleDeleteEmail = async (email: Email) => {
    try {
      const emailRef = doc(db, "emails", email.id);
      if (email.folder === "trash") {
        await deleteDoc(emailRef);
      } else {
        await updateDoc(emailRef, {
          folder: "trash",
        });
      }
      setEmails(emails.filter((e) => e.id !== email.id));
      setSelectedEmail(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleEmailClick = async (email: Email) => {
    if (!email.read) {
      try {
        const emailRef = doc(db, "emails", email.id);
        await updateDoc(emailRef, {
          read: true,
        });
        setEmails(
          emails.map((e) => (e.id === email.id ? { ...e, read: true } : e))
        );
      } catch (error) {
        console.error("Erreur lors du marquage comme lu:", error);
      }
    }
    setSelectedEmail(email);
  };

  const handleReply = (email: Email) => {
    setReplyData({
      to: email.from,
      subject: `Re: ${email.subject}`,
      content: `\n\n\n------ Message original ------\nDe: ${
        email.from
      }\nDate: ${format(new Date(email.timestamp), "d MMMM yyyy 'à' HH:mm", {
        locale: fr,
      })}\nObjet: ${email.subject}\n\n${email.content}`,
    });
    setIsComposeOpen(true);
  };

  const handleForward = (email: Email) => {
    setReplyData({
      to: "",
      subject: `Tr: ${email.subject}`,
      content: `\n\n\n------ Message transféré ------\nDe: ${
        email.from
      }\nDate: ${format(new Date(email.timestamp), "d MMMM yyyy 'à' HH:mm", {
        locale: fr,
      })}\nObjet: ${email.subject}\n\n${email.content}`,
    });
    setIsComposeOpen(true);
  };

  const folders = [
    { id: "inbox", label: "Boîte de réception", icon: Inbox },
    { id: "sent", label: "Envoyés", icon: Send },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "trash", label: "Corbeille", icon: Trash2 },
  ];

  const filteredEmails = emails.filter(
    (email) =>
      email.folder === selectedFolder &&
      (searchTerm === "" ||
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Fonction de synchronisation des emails
  const syncEmails = async () => {
    if (!auth.currentUser) {
      setToastMessage("Veuillez vous connecter pour synchroniser vos emails");
      setShowToast(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Obtenir le token d'authentification
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/email/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
        }),
      });

      // Vérifier si la réponse est de type JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse du serveur n'est pas au format JSON");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la synchronisation");
      }

      // Recharger les emails après la synchronisation
      await loadEmails();

      // Afficher le toast de succès
      setToastMessage(data.message || "Synchronisation réussie");
      setShowToast(true);
    } catch (error) {
      console.error("Erreur détaillée lors de la synchronisation:", error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Erreur lors de la synchronisation des emails"
      );
      setShowToast(true);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={`h-screen flex ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Panneau latéral des dossiers */}
      <div
        className={`w-64 p-4 border-r ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="space-y-4">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Nouveau message</span>
          </button>

          <button
            onClick={() => setIsConfigOpen(true)}
            className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isDarkMode
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Settings size={20} />
            <span>Configuration</span>
          </button>
        </div>

        <nav className="mt-4">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id as Folder)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg mb-1 transition-colors ${
                selectedFolder === folder.id
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                  ? "hover:bg-gray-800"
                  : "hover:bg-gray-200"
              }`}
            >
              <folder.icon size={20} />
              <span>{folder.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={syncEmails}
              disabled={isSyncing}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
              } ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Synchroniser les emails"
            >
              <RefreshCw
                size={20}
                className={`${isSyncing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {selectedEmail ? (
          <EmailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onStar={() => handleStarEmail(selectedEmail)}
            onArchive={() => handleArchiveEmail(selectedEmail)}
            onDelete={() => handleDeleteEmail(selectedEmail)}
            onReply={() => handleReply(selectedEmail)}
            onForward={() => handleForward(selectedEmail)}
          />
        ) : (
          <>
            {/* Barre de recherche */}
            <div className="p-4 border-b flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 pl-10 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-800 text-white placeholder-gray-400"
                      : "bg-white text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <Search
                  size={20}
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </div>
            </div>

            {/* Liste des emails */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-lg">Aucun email dans ce dossier</div>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className={`w-full p-4 text-left flex items-start gap-4 transition-colors cursor-pointer ${
                        !email.read ? "font-semibold" : ""
                      } ${
                        isDarkMode
                          ? "hover:bg-gray-800 divide-gray-700"
                          : "hover:bg-gray-100 divide-gray-200"
                      }`}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStarEmail(email);
                        }}
                        className={`flex-shrink-0 cursor-pointer ${
                          email.starred ? "text-yellow-400" : "text-gray-400"
                        }`}
                      >
                        <Star size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{email.from}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(email.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="truncate">{email.subject}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {email.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyData(null);
        }}
        onSend={handleSendEmail}
        initialData={replyData}
      />

      <EmailConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />

      <Toast.Provider>
        <Toast.Root
          open={showToast}
          onOpenChange={setShowToast}
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}
        >
          <Toast.Title className="font-medium">{toastMessage}</Toast.Title>
          <Toast.Close className="absolute top-2 right-2">
            <X size={16} />
          </Toast.Close>
        </Toast.Root>
        <Toast.Viewport />
      </Toast.Provider>
    </div>
  );
}
