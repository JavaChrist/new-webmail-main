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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} copié avec succès !`);
    } catch (err) {
      console.error("Erreur lors de la copie :", err);
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
            onClick={() => onContactSelect(contact)}
            className={`${
              isDarkMode
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-white hover:bg-gray-50"
            } rounded-lg p-4 shadow-md cursor-pointer transition-colors`}
          >
            <div
              className="w-full h-1 rounded-t-lg mb-3"
              style={getCategoryStyle(contact.categorie)}
            />
            <div className="flex items-start justify-between">
              <div>
                <h3
                  className={`font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
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
                <div className="flex items-center gap-2 text-sm">
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
              )}
              {contact.telephone && (
                <div className="flex items-center gap-2 text-sm">
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
              {contact.ville && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin
                    size={16}
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  />
                  <span
                    className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                  >
                    {contact.ville}
                  </span>
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
              Catégorie
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
              onClick={() => onContactSelect(contact)}
              className={`cursor-pointer ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
              }`}
            >
              <td
                className={`px-6 py-4 whitespace-nowrap ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                <div className="flex items-center">
                  <div>
                    <div className="font-medium">
                      {contact.prenom} {contact.nom}
                    </div>
                    {contact.ville && (
                      <div
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {contact.ville}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap ${
                  isDarkMode ? "text-gray-300" : "text-gray-500"
                }`}
              >
                <div className="text-sm">
                  <div>{contact.email}</div>
                  <div>{contact.telephone}</div>
                </div>
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap ${
                  isDarkMode ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {contact.entreprise || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  style={getCategoryStyle(contact.categorie)}
                >
                  {contactCategories[contact.categorie]?.label || "Autre"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
