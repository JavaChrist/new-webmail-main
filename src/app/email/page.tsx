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
  Folder as FolderIcon,
  Mail,
  Home,
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
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import EmailConfig from "@/components/email/EmailConfig";
import * as Toast from "@radix-ui/react-toast";
import { useNewEmailStore } from "@/store/emailStore";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Draggable),
  { ssr: false }
);

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

interface CustomFolder {
  id: string;
  name: string;
  userId: string;
}

type Folder = "inbox" | "sent" | "archive" | "trash" | string;

export default function EmailPage() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder>("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 20;
  const [replyData, setReplyData] = useState<{
    to: string;
    subject: string;
    content: string;
  } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const { to, subject, content, resetNewEmail, setNewEmail } =
    useNewEmailStore();
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        loadEmails();
        syncEmails();
        loadCustomFolders();
        const syncInterval = setInterval(syncEmails, 5 * 60 * 1000);
        return () => clearInterval(syncInterval);
      }
    });

    return () => unsubscribe();
  }, [router, selectedFolder]);

  useEffect(() => {
    if (to) {
      setIsComposeOpen(true);
      setNewEmail(to, subject, content);
      resetNewEmail();
    }
  }, [to, subject, content, setNewEmail, resetNewEmail]);

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

  const getUnreadCount = (folder: string) => {
    return emails.filter((email) => email.folder === folder && !email.read)
      .length;
  };

  const formatEmailDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return format(date, "HH:mm", { locale: fr });
    } else if (isThisYear) {
      return format(date, "d MMM", { locale: fr });
    } else {
      return format(date, "dd/MM/yyyy", { locale: fr });
    }
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.folder === selectedFolder &&
      (searchTerm === "" ||
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedEmails = filteredEmails.slice(
    (currentPage - 1) * emailsPerPage,
    currentPage * emailsPerPage
  );

  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

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

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Configuration email non trouvée") {
          return;
        }
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

  const cleanHtmlContent = (content: string): string => {
    // Supprimer les balises DOCTYPE, html, head, etc.
    content = content
      .replace(/<\!DOCTYPE[^>]*>/i, "")
      .replace(/<html[^>]*>/i, "")
      .replace(/<\/html>/i, "")
      .replace(/<head>.*?<\/head>/is, "")
      .replace(/<body[^>]*>/i, "")
      .replace(/<\/body>/i, "");

    // Supprimer toutes les balises HTML restantes
    content = content.replace(/<[^>]*>/g, "");

    // Supprimer les espaces multiples et les retours à la ligne
    content = content.replace(/\s+/g, " ").trim();

    return content;
  };

  // Charger les dossiers personnalisés
  const loadCustomFolders = async () => {
    if (!auth.currentUser) return;
    try {
      const foldersRef = collection(db, "folders");
      const q = query(foldersRef, where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const folders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CustomFolder[];
      setCustomFolders(folders);
    } catch (error) {
      console.error("Erreur lors du chargement des dossiers:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!auth.currentUser || !newFolderName.trim()) return;

    try {
      const folderRef = await addDoc(collection(db, "folders"), {
        name: newFolderName.trim(),
        userId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
      });

      setCustomFolders([
        ...customFolders,
        {
          id: folderRef.id,
          name: newFolderName.trim(),
          userId: auth.currentUser.uid,
        },
      ]);

      setNewFolderName("");
      setIsCreateFolderOpen(false);
    } catch (error) {
      console.error("Erreur lors de la création du dossier:", error);
      setToastMessage("Erreur lors de la création du dossier");
      setShowToast(true);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!auth.currentUser) return;

    try {
      // Supprimer le dossier
      await deleteDoc(doc(db, "folders", folderId));

      // Déplacer les emails du dossier vers la boîte de réception
      const emailsRef = collection(db, "emails");
      const q = query(
        emailsRef,
        where("userId", "==", auth.currentUser.uid),
        where("folder", "==", folderId)
      );
      const snapshot = await getDocs(q);

      await Promise.all(
        snapshot.docs.map((doc) => updateDoc(doc.ref, { folder: "inbox" }))
      );

      setCustomFolders(customFolders.filter((f) => f.id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder("inbox");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du dossier:", error);
      setToastMessage("Erreur lors de la suppression du dossier");
      setShowToast(true);
    }
  };

  const handleMoveEmail = async (emailId: string, targetFolder: string) => {
    try {
      const emailToMove = emails.find((e) => e.id === emailId);
      if (!emailToMove) return;

      const emailRef = doc(db, "emails", emailId);
      await updateDoc(emailRef, {
        folder: targetFolder,
      });

      setEmails(emails.filter((e) => e.id !== emailId));
      setToastMessage("Email déplacé avec succès");
      setShowToast(true);
    } catch (error) {
      console.error("Erreur lors du déplacement de l'email:", error);
      setToastMessage("Erreur lors du déplacement de l'email");
      setShowToast(true);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const emailId = result.draggableId;
    const targetFolder = result.destination.droppableId;

    if (targetFolder !== selectedFolder) {
      handleMoveEmail(emailId, targetFolder);
    }
  };

  const handleEmptyTrashClick = () => {
    setIsConfirmTrashOpen(true);
  };

  const handleConfirmEmptyTrash = async () => {
    await handleEmptyTrash();
    setIsConfirmTrashOpen(false);
  };

  const handleEmptyTrash = async () => {
    if (!auth.currentUser) return;

    try {
      // Récupérer tous les emails de la corbeille
      const emailsRef = collection(db, "emails");
      const q = query(
        emailsRef,
        where("userId", "==", auth.currentUser.uid),
        where("folder", "==", "trash")
      );
      const snapshot = await getDocs(q);

      // Supprimer tous les emails
      await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));

      // Mettre à jour l'interface si on est dans la corbeille
      if (selectedFolder === "trash") {
        setEmails([]);
      }

      setToastMessage("Corbeille vidée avec succès");
      setShowToast(true);
    } catch (error) {
      console.error("Erreur lors du vidage de la corbeille:", error);
      setToastMessage("Erreur lors du vidage de la corbeille");
      setShowToast(true);
    }
  };

  const handleFolderChange = async (newFolder: Folder) => {
    setSelectedFolder(newFolder);
    setSelectedEmail(null);
    setCurrentPage(1);
    await loadEmails();
  };

  const handleCheckEmail = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === paginatedEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(paginatedEmails.map((email) => email.id));
    }
  };

  const handleBulkAction = async (
    action: "archive" | "delete" | "markRead" | "markUnread"
  ) => {
    if (selectedEmails.length === 0) return;

    try {
      for (const emailId of selectedEmails) {
        const email = emails.find((e) => e.id === emailId);
        if (!email) continue;

        const emailRef = doc(db, "emails", emailId);
        switch (action) {
          case "archive":
            await updateDoc(emailRef, { folder: "archive" });
            break;
          case "delete":
            if (selectedFolder === "trash") {
              await deleteDoc(emailRef);
            } else {
              await updateDoc(emailRef, { folder: "trash" });
            }
            break;
          case "markRead":
            await updateDoc(emailRef, { read: true });
            break;
          case "markUnread":
            await updateDoc(emailRef, { read: false });
            break;
        }
      }

      // Mettre à jour l'interface
      if (["archive", "delete"].includes(action)) {
        setEmails(emails.filter((email) => !selectedEmails.includes(email.id)));
      } else {
        setEmails(
          emails.map((email) => {
            if (selectedEmails.includes(email.id)) {
              return {
                ...email,
                read: action === "markRead",
              };
            }
            return email;
          })
        );
      }

      setSelectedEmails([]);
      setToastMessage(
        `${selectedEmails.length} email(s) ${
          action === "archive"
            ? "archivé(s)"
            : action === "delete"
            ? "supprimé(s)"
            : action === "markRead"
            ? "marqué(s) comme lu(s)"
            : "marqué(s) comme non lu(s)"
        }`
      );
      setShowToast(true);
    } catch (error) {
      console.error("Erreur lors de l'action en masse:", error);
      setToastMessage("Erreur lors de l'action en masse");
      setShowToast(true);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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

          <nav className="mt-4 space-y-1">
            {/* Dossiers système */}
            {folders.map((folder) => (
              <Droppable key={folder.id} droppableId={folder.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${
                      snapshot.isDraggingOver && selectedFolder !== folder.id
                        ? isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-200"
                        : ""
                    } rounded-lg transition-colors`}
                  >
                    {folder.id === "trash" ? (
                      <ContextMenu.Root>
                        <ContextMenu.Trigger>
                          <button
                            onClick={() =>
                              handleFolderChange(folder.id as Folder)
                            }
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                              selectedFolder === folder.id
                                ? "bg-blue-600 text-white"
                                : isDarkMode
                                ? "hover:bg-gray-800"
                                : "hover:bg-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <folder.icon size={20} />
                              <span>{folder.label}</span>
                            </div>
                          </button>
                        </ContextMenu.Trigger>
                        <ContextMenu.Portal>
                          <ContextMenu.Content
                            className={`min-w-[160px] p-1 rounded-lg shadow-lg ${
                              isDarkMode
                                ? "bg-gray-800 text-white border border-gray-700"
                                : "bg-white text-gray-900 border border-gray-200"
                            }`}
                          >
                            <ContextMenu.Item
                              onClick={handleEmptyTrashClick}
                              className={`flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer ${
                                isDarkMode
                                  ? "hover:bg-gray-700"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              <Trash2 size={16} />
                              Vider la corbeille
                            </ContextMenu.Item>
                          </ContextMenu.Content>
                        </ContextMenu.Portal>
                      </ContextMenu.Root>
                    ) : (
                      <button
                        onClick={() => handleFolderChange(folder.id as Folder)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                          selectedFolder === folder.id
                            ? "bg-blue-600 text-white"
                            : isDarkMode
                            ? "hover:bg-gray-800"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <folder.icon size={20} />
                          <span>{folder.label}</span>
                        </div>
                        {folder.id === "inbox" &&
                          getUnreadCount("inbox") > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              {getUnreadCount("inbox")}
                            </span>
                          )}
                      </button>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}

            {/* Séparateur */}
            <div
              className={`h-px my-2 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            />

            {/* Bouton Créer un dossier */}
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
              }`}
            >
              <Plus size={20} />
              <span>Nouveau dossier</span>
            </button>

            {/* Dossiers personnalisés */}
            {customFolders.map((folder) => (
              <Droppable key={folder.id} droppableId={folder.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${
                      snapshot.isDraggingOver && selectedFolder !== folder.id
                        ? isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-200"
                        : ""
                    } rounded-lg transition-colors`}
                  >
                    <div
                      className={`group flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedFolder === folder.id
                          ? "bg-blue-600 text-white"
                          : isDarkMode
                          ? "hover:bg-gray-800"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => handleFolderChange(folder.id)}
                        className="flex items-center gap-2 flex-1"
                      >
                        <FolderIcon size={20} />
                        <span>{folder.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:bg-red-500 hover:text-white`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </nav>

          {/* Modal de création de dossier */}
          {isCreateFolderOpen && (
            <div
              className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50`}
            >
              <div
                className={`${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}
              >
                <h3 className="text-lg font-medium mb-4">
                  Créer un nouveau dossier
                </h3>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nom du dossier"
                  className={`w-full px-4 py-2 rounded-lg mb-4 ${
                    isDarkMode
                      ? "bg-gray-700 text-white placeholder-gray-400"
                      : "bg-gray-50 text-gray-900 placeholder-gray-500"
                  }`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCreateFolderOpen(false)}
                    className={`px-4 py-2 rounded-lg ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!newFolderName.trim()}
                  >
                    Créer
                  </button>
                </div>
              </div>
            </div>
          )}
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
              {/* Barre de recherche et actions en masse */}
              <div className="p-4 border-b flex items-center gap-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedEmails.length === paginatedEmails.length &&
                      paginatedEmails.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {selectedEmails.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBulkAction("archive")}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
                        }`}
                        title="Archiver la sélection"
                      >
                        <Archive size={20} />
                      </button>
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
                        }`}
                        title="Supprimer la sélection"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button
                        onClick={() => handleBulkAction("markRead")}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
                        }`}
                        title="Marquer comme lu"
                      >
                        <Mail size={20} />
                      </button>
                      <button
                        onClick={() => handleBulkAction("markUnread")}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
                        }`}
                        title="Marquer comme non lu"
                      >
                        <Mail size={20} className="fill-current" />
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedEmails.length} sélectionné(s)
                      </span>
                    </div>
                  )}
                </div>
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
                  <Droppable droppableId={selectedFolder}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="divide-y"
                      >
                        {paginatedEmails.map((email, index) => (
                          <Draggable
                            key={email.id}
                            draggableId={email.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`w-full p-4 text-left flex items-start gap-4 transition-colors cursor-pointer ${
                                  !email.read
                                    ? isDarkMode
                                      ? "bg-gray-800 font-semibold"
                                      : "bg-blue-50 font-semibold"
                                    : isDarkMode
                                    ? "bg-transparent"
                                    : "bg-white"
                                } ${
                                  snapshot.isDragging
                                    ? isDarkMode
                                      ? "bg-gray-700"
                                      : "bg-gray-200"
                                    : isDarkMode
                                    ? "hover:bg-gray-800"
                                    : "hover:bg-gray-100"
                                } ${
                                  selectedEmails.includes(email.id)
                                    ? isDarkMode
                                      ? "bg-gray-700"
                                      : "bg-gray-100"
                                    : ""
                                }`}
                                onClick={() => handleEmailClick(email)}
                              >
                                <div className="flex flex-col items-center gap-2 mr-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmails.includes(email.id)}
                                    onChange={(e) =>
                                      handleCheckEmail(e as any, email.id)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStarEmail(email);
                                    }}
                                    className={`flex-shrink-0 cursor-pointer ${
                                      email.starred
                                        ? "text-yellow-400"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    <Star size={20} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`truncate max-w-[200px] ${
                                        !email.read
                                          ? isDarkMode
                                            ? "text-white font-bold"
                                            : "text-gray-900 font-bold"
                                          : isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {email.from}
                                    </span>
                                    <span
                                      className={`flex-shrink-0 text-sm ml-auto ${
                                        !email.read
                                          ? isDarkMode
                                            ? "text-gray-300"
                                            : "text-gray-700"
                                          : isDarkMode
                                          ? "text-gray-500"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {formatEmailDate(
                                        new Date(email.timestamp)
                                      )}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-sm truncate max-w-full pr-4 ${
                                      !email.read
                                        ? isDarkMode
                                          ? "text-gray-200"
                                          : "text-gray-800"
                                        : isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {email.subject}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
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

        {/* Boîte de dialogue de confirmation */}
        <Dialog.Root
          open={isConfirmTrashOpen}
          onOpenChange={setIsConfirmTrashOpen}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
            <Dialog.Content
              className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}
            >
              <Dialog.Title className="text-lg font-medium mb-4">
                Vider la corbeille
              </Dialog.Title>
              <Dialog.Description className="text-sm mb-6">
                Êtes-vous sûr de vouloir vider définitivement la corbeille ?
                Cette action est irréversible.
              </Dialog.Description>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsConfirmTrashOpen(false)}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmEmptyTrash}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Vider la corbeille
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </DragDropContext>
  );
}
