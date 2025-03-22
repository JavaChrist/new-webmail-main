"use client";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";

// Types et constantes
export const contactCategories = {
  personal: { label: "Personnel", color: "#3b82f6" },
  professional: { label: "Professionnel", color: "#10b981" },
  family: { label: "Famille", color: "#f59e0b" },
  other: { label: "Autre", color: "#6b7280" },
} as const;

export type ContactCategory = keyof typeof contactCategories;

export interface Contact {
  id?: string;
  userId?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  notes?: string;
  categorie: ContactCategory;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  selectedContact?: Contact;
  isDarkMode?: boolean;
}

const defaultContact: Contact = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  entreprise: "",
  adresse: "",
  codePostal: "",
  ville: "",
  notes: "",
  categorie: "personal",
};

export default function ContactModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedContact,
  isDarkMode = true,
}: ContactModalProps) {
  const [contact, setContact] = useState<Contact>(defaultContact);

  useEffect(() => {
    if (selectedContact) {
      setContact(selectedContact);
    } else {
      setContact(defaultContact);
    }
  }, [selectedContact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Formatage final des données avant sauvegarde
    const formattedContact = {
      ...contact,
      nom: contact.nom.toUpperCase(),
      email: contact.email.toLowerCase(),
    };
    await onSave(formattedContact);
    setContact(defaultContact);
    onClose();
  };

  const handleInputChange = (field: keyof Contact, value: string) => {
    let formattedValue = value;
    if (field === "nom") {
      formattedValue = value.toUpperCase();
    } else if (field === "email") {
      formattedValue = value.toLowerCase();
    }
    setContact({ ...contact, [field]: formattedValue });
  };

  const handleClose = () => {
    setContact(defaultContact);
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(contact);
      setContact(defaultContact);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full max-w-2xl transform overflow-hidden rounded-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } p-6 text-left align-middle shadow-xl transition-all`}
              >
                <Dialog.Title
                  as="h3"
                  className={`text-lg font-medium leading-6 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } flex justify-between items-center`}
                >
                  {selectedContact ? "Modifier le contact" : "Nouveau contact"}
                  <button
                    onClick={handleClose}
                    className={`${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    <X size={20} />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Nom *
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.nom}
                        onChange={(e) =>
                          handleInputChange("nom", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={contact.prenom}
                        onChange={(e) =>
                          handleInputChange("prenom", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={contact.telephone}
                        onChange={(e) =>
                          handleInputChange("telephone", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Entreprise
                    </label>
                    <input
                      type="text"
                      value={contact.entreprise}
                      onChange={(e) =>
                        handleInputChange("entreprise", e.target.value)
                      }
                      className={`mt-1 block w-full rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900"
                      } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={contact.adresse}
                      onChange={(e) =>
                        handleInputChange("adresse", e.target.value)
                      }
                      className={`mt-1 block w-full rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900"
                      } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={contact.codePostal}
                        onChange={(e) =>
                          handleInputChange("codePostal", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Ville
                      </label>
                      <input
                        type="text"
                        value={contact.ville}
                        onChange={(e) =>
                          handleInputChange("ville", e.target.value)
                        }
                        className={`mt-1 block w-full rounded-md ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900"
                        } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Catégorie
                    </label>
                    <select
                      value={contact.categorie}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          categorie: e.target
                            .value as keyof typeof contactCategories,
                        })
                      }
                      className={`mt-1 block w-full rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    >
                      {Object.entries(contactCategories).map(
                        ([key, { label }]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Notes
                    </label>
                    <textarea
                      value={contact.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      rows={3}
                      className={`mt-1 block w-full rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900"
                      } shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    {selectedContact && onDelete && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className={`inline-flex justify-center rounded-md border border-transparent ${
                          isDarkMode
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        } px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`}
                      >
                        Supprimer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClose}
                      className={`inline-flex justify-center rounded-md border ${
                        isDarkMode
                          ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      } px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      {selectedContact ? "Mettre à jour" : "Créer"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
