"use client";
import {
  Mail,
  Phone,
  Building2,
  Edit,
  MapPin,
  Copy,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { Contact, contactCategories, ContactCategory } from "./ContactModal";
import { useState } from "react";
import { useNewEmailStore } from "@/store/emailStore";
import { useRouter } from "next/navigation";

interface ContactListProps {
  contacts: Contact[];
  onContactSelect: (contact: Contact) => void;
  viewMode: "grid" | "list";
  isDarkMode?: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function ContactList({
  contacts,
  onContactSelect,
  viewMode,
  isDarkMode = true,
}: ContactListProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const setNewEmail = useNewEmailStore((state) => state.setNewEmail);
  const router = useRouter();

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

  const handleEmailClick = (email: string) => {
    setNewEmail(email);
    router.push("/email");
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} copié avec succès !`);
    } catch (err) {
      showToast("Erreur lors de la copie", "error");
    }
  };

  const openGoogleMaps = (contact: Contact) => {
    const address = [contact.adresse, contact.codePostal, contact.ville]
      .filter(Boolean)
      .join(", ");

    if (address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`;
      window.open(url, "_blank");
    }
  };

  const getContactInitials = (contact: Contact) => {
    return `${contact.prenom[0]}${contact.nom[0]}`.toUpperCase();
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
          Aucun contact trouvé
        </p>
      </div>
    );
  }

  const getCategoryStyle = (categorie: ContactCategory) => {
    const category = contactCategories[categorie];
    return {
      backgroundColor: category?.color || contactCategories.other.color,
      color: "white",
    };
  };

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`${
              isDarkMode
                ? "bg-gray-800 hover:bg-gray-900"
                : "bg-white hover:bg-gray-200"
            } rounded-lg p-4 shadow-md transition-colors`}
          >
            <div
              className="w-full h-1 rounded-t-lg mb-3"
              style={getCategoryStyle(contact.categorie)}
            />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } cursor-pointer`}
                  onClick={() => onContactSelect(contact)}
                >
                  {contact.prenom} {contact.nom}
                </h3>
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {contactCategories[contact.categorie]?.label || "Autre"}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {contact.email && (
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <Mail
                      size={16}
                      className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                    />
                    <span
                      className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                    >
                      {contact.email}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(contact.email, "Email")}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Copier l'email"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        handleEmailClick(contact.email);
                      }}
                      href="#"
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Envoyer un email"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
              {contact.telephone && (
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <Phone
                      size={16}
                      className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                    />
                    <span
                      className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                    >
                      {contact.telephone}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        copyToClipboard(contact.telephone, "Téléphone")
                      }
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Copier le numéro"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={`tel:${contact.telephone}`}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Appeler"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                </div>
              )}
              {contact.entreprise && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2
                    size={16}
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  />
                  <span
                    className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                  >
                    {contact.entreprise}
                  </span>
                </div>
              )}
              {(contact.adresse || contact.ville) && (
                <div className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <MapPin
                      size={16}
                      className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                    />
                    <span
                      className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                    >
                      {[contact.adresse, contact.codePostal, contact.ville]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openGoogleMaps(contact)}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="Ouvrir dans Google Maps"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className={`min-w-full divide-y ${
          isDarkMode ? "divide-gray-700" : "divide-gray-200"
        }`}
      >
        <thead className={isDarkMode ? "bg-gray-800" : "bg-gray-50"}>
          <tr>
            <th
              scope="col"
              className={`px-6 py-3 text-left text-xs font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } uppercase tracking-wider`}
            >
              Nom
            </th>
            <th
              scope="col"
              className={`px-6 py-3 text-left text-xs font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } uppercase tracking-wider`}
            >
              Contact
            </th>
            <th
              scope="col"
              className={`px-6 py-3 text-left text-xs font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } uppercase tracking-wider`}
            >
              Entreprise
            </th>
            <th
              scope="col"
              className={`px-6 py-3 text-left text-xs font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } uppercase tracking-wider`}
            >
              Adresse
            </th>
            <th
              scope="col"
              className={`px-6 py-3 text-left text-xs font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } uppercase tracking-wider`}
            >
              Catégorie
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody
          className={`divide-y ${
            isDarkMode ? "divide-gray-700" : "divide-gray-200"
          }`}
        >
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              className={`${
                isDarkMode
                  ? "bg-gray-800 hover:bg-gray-900"
                  : "bg-white hover:bg-gray-200"
              } transition-colors`}
            >
              <td
                className={`px-6 py-4 whitespace-nowrap cursor-pointer ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
                onClick={() => onContactSelect(contact)}
              >
                <div className="flex items-center">
                  <div>
                    <div className="font-medium">
                      {contact.prenom} {contact.nom}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm group">
                      <Mail
                        size={16}
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }
                      />
                      <span
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        {contact.email}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            copyToClipboard(contact.email, "Email")
                          }
                          className="p-1 hover:bg-gray-600 rounded"
                          title="Copier l'email"
                        >
                          <Copy size={14} />
                        </button>
                        <a
                          onClick={(e) => {
                            e.preventDefault();
                            handleEmailClick(contact.email);
                          }}
                          href="#"
                          className="p-1 hover:bg-gray-600 rounded"
                          title="Envoyer un email"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                  {contact.telephone && (
                    <div className="flex items-center gap-2 text-sm group">
                      <Phone
                        size={16}
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }
                      />
                      <span
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        {contact.telephone}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            copyToClipboard(contact.telephone, "Téléphone")
                          }
                          className="p-1 hover:bg-gray-600 rounded"
                          title="Copier le numéro"
                        >
                          <Copy size={14} />
                        </button>
                        <a
                          href={`tel:${contact.telephone}`}
                          className="p-1 hover:bg-gray-600 rounded"
                          title="Appeler"
                        >
                          <Phone size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {contact.entreprise}
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 group">
                  <span>
                    {[contact.adresse, contact.codePostal, contact.ville]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  {(contact.adresse || contact.ville) && (
                    <button
                      onClick={() => openGoogleMaps(contact)}
                      className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Ouvrir dans Google Maps"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  style={getCategoryStyle(contact.categorie)}
                >
                  {contactCategories[contact.categorie]?.label || "Autre"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onContactSelect(contact)}
                  className={`text-${
                    isDarkMode ? "blue-400" : "blue-600"
                  } hover:text-${isDarkMode ? "blue-300" : "blue-700"}`}
                >
                  <Edit size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
