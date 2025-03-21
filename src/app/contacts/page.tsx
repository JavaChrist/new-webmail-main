"use client";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  DocumentData,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import {
  Search,
  SortAsc,
  SortDesc,
  CheckCircle,
  AlertCircle,
  Download,
  LayoutGrid,
  List,
  Upload,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";

// Import des composants et types
import ContactList from "@/components/contacts/ContactList";
import ContactModal, {
  Contact,
  ContactCategory,
  contactCategories,
} from "@/components/contacts/ContactModal";

type SortField = "nom" | "prenom" | "email" | "entreprise" | "ville";
type SortOrder = "asc" | "desc";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function ContactsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<
    Set<keyof typeof contactCategories>
  >(
    new Set(
      Object.keys(contactCategories) as (keyof typeof contactCategories)[]
    )
  );
  const [sortField, setSortField] = useState<SortField>("nom");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        loadContacts();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const loadContacts = async () => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const contactsRef = collection(db, "contacts");
      const q = query(contactsRef, where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);

      const loadedContacts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          nom: data.nom || "",
          prenom: data.prenom || "",
          email: data.email || "",
          telephone: data.telephone || "",
          entreprise: data.entreprise || "",
          adresse: data.adresse || "",
          codePostal: data.codePostal || "",
          ville: data.ville || "",
          notes: data.notes || "",
          categorie: (data.categorie === "private"
            ? "personal"
            : data.categorie || "other") as ContactCategory,
        };
      });

      setContacts(loadedContacts);
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des contacts:", error);
      setIsLoading(false);
    }
  };

  // Fonction de tri des contacts
  const sortContacts = (a: Contact, b: Contact) => {
    const aValue = a[sortField]?.toLowerCase() || "";
    const bValue = b[sortField]?.toLowerCase() || "";
    return sortOrder === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  };

  // Filtrer les contacts selon le terme de recherche
  const filteredContacts = contacts.filter((contact) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      contact.nom.toLowerCase().includes(searchTermLower) ||
      contact.prenom.toLowerCase().includes(searchTermLower) ||
      contact.email.toLowerCase().includes(searchTermLower) ||
      contact.entreprise?.toLowerCase().includes(searchTermLower) ||
      contact.ville?.toLowerCase().includes(searchTermLower)
    );
  });

  const handleSaveContact = async (contact: Contact) => {
    if (!auth.currentUser) return;

    try {
      if (contact.id) {
        // Mise à jour d'un contact existant
        await updateDoc(doc(db, "contacts", contact.id), {
          ...contact,
          userId: auth.currentUser.uid,
        });
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? contact : c))
        );
        showToast("Contact mis à jour avec succès", "success");
      } else {
        // Création d'un nouveau contact
        const docRef = await addDoc(collection(db, "contacts"), {
          ...contact,
          userId: auth.currentUser.uid,
        });
        const newContact = { ...contact, id: docRef.id };
        setContacts((prev) => [...prev, newContact]);
        showToast("Contact créé avec succès", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du contact:", error);
      showToast("Erreur lors de la sauvegarde du contact", "error");
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!contact.id || !auth.currentUser) return;

    try {
      await deleteDoc(doc(db, "contacts", contact.id));
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setIsModalOpen(false);
      showToast("Contact supprimé avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la suppression du contact:", error);
      showToast("Erreur lors de la suppression du contact", "error");
    }
  };

  const toggleCategory = (category: keyof typeof contactCategories) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Fonction pour exporter les contacts au format vCard
  const exportContacts = () => {
    const vCards = filteredContacts
      .map((contact) => {
        const address = [contact.adresse, contact.codePostal, contact.ville]
          .filter(Boolean)
          .join(", ");

        return `BEGIN:VCARD
VERSION:3.0
N:${contact.nom};${contact.prenom};;;
FN:${contact.prenom} ${contact.nom}
EMAIL:${contact.email}
TEL:${contact.telephone}
${contact.entreprise ? `ORG:${contact.entreprise}\n` : ""}${
          address ? `ADR:;;${address};;;;\n` : ""
        }${contact.notes ? `NOTE:${contact.notes}\n` : ""}END:VCARD
`;
      })
      .join("\n");

    const blob = new Blob([vCards], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts.vcf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Contacts exportés avec succès !");
  };

  // Gestionnaire de raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ne pas déclencher les raccourcis si on est dans un champ de saisie
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "n": // Nouveau contact
            e.preventDefault();
            setSelectedContact(undefined);
            setIsModalOpen(true);
            break;
          case "f": // Rechercher
            e.preventDefault();
            document
              .querySelector<HTMLInputElement>('input[type="text"]')
              ?.focus();
            break;
          case "e": // Exporter
            e.preventDefault();
            exportContacts();
            break;
          case "v": // Changer de vue
            e.preventDefault();
            setViewMode(viewMode === "grid" ? "list" : "grid");
            break;
        }
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
        setSelectedContact(undefined);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isModalOpen, viewMode]);

  // Fonction pour importer des contacts
  const importContacts = async (file: File) => {
    try {
      const text = await file.text();
      const contacts = [];
      let currentContact: Partial<Contact> = {};

      // Parser le fichier vCard
      const lines = text.split("\n");
      for (const line of lines) {
        const [key, value] = line.split(":");

        if (key === "BEGIN" && value.trim() === "VCARD") {
          currentContact = {};
        } else if (key === "END" && value.trim() === "VCARD") {
          if (
            currentContact.nom &&
            currentContact.prenom &&
            currentContact.email
          ) {
            contacts.push({
              ...currentContact,
              id: crypto.randomUUID(),
              userId: auth.currentUser?.uid || "",
              categorie: "personal" as ContactCategory,
              telephone: currentContact.telephone || "",
            } as Contact);
          }
        } else if (key === "N") {
          const [nom, prenom] = value.split(";");
          currentContact.nom = nom.trim();
          currentContact.prenom = prenom.trim();
        } else if (key === "EMAIL") {
          currentContact.email = value.trim();
        } else if (key === "TEL") {
          currentContact.telephone = value.trim();
        } else if (key === "ORG") {
          currentContact.entreprise = value.trim();
          currentContact.categorie = "professional" as ContactCategory;
        } else if (key === "ADR") {
          const [, , street, city, , postal] = value.split(";");
          currentContact.adresse = street.trim();
          currentContact.ville = city.trim();
          currentContact.codePostal = postal.trim();
        } else if (key === "NOTE") {
          currentContact.notes = value.trim();
        }
      }

      // Sauvegarder les contacts dans Firebase
      for (const contact of contacts) {
        await addDoc(collection(db, "contacts"), contact);
      }

      // Recharger les contacts
      const contactsRef = collection(db, "contacts");
      const q = query(
        contactsRef,
        where("userId", "==", auth.currentUser?.uid)
      );
      const querySnapshot = await getDocs(q);
      const loadedContacts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        categorie: (doc.data().categorie ||
          "personal") as keyof typeof contactCategories,
      })) as Contact[];

      setContacts(loadedContacts);
      showToast(`${contacts.length} contacts importés avec succès !`);
    } catch (error) {
      console.error("Erreur lors de l'importation :", error);
      showToast("Erreur lors de l'importation des contacts", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-8 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      } min-h-screen`}
    >
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Contacts</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
              }`}
              title={viewMode === "grid" ? "Vue liste" : "Vue grille"}
            >
              {viewMode === "grid" ? (
                <List size={20} />
              ) : (
                <LayoutGrid size={20} />
              )}
            </button>
            {/* Bouton d'export */}
            <button
              onClick={exportContacts}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
              }`}
              title="Exporter les contacts"
            >
              <Download size={20} />
            </button>
            {/* Bouton d'import */}
            <label
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
              }`}
              title="Importer des contacts"
            >
              <Upload size={20} />
              <input
                type="file"
                accept=".vcf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importContacts(file);
                    e.target.value = ""; // Réinitialiser l'input
                  }
                }}
              />
            </label>
            <button
              onClick={() => {
                setSelectedContact(undefined);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>Nouveau contact</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un contact..."
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

      {/* Liste des contacts */}
      <ContactList
        contacts={filteredContacts}
        onContactSelect={(contact) => {
          setSelectedContact(contact);
          setIsModalOpen(true);
        }}
        viewMode={viewMode}
        isDarkMode={isDarkMode}
      />

      {/* Modal de contact */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContact(undefined);
        }}
        onSave={handleSaveContact}
        onDelete={handleDeleteContact}
        selectedContact={selectedContact}
      />
    </div>
  );
}
