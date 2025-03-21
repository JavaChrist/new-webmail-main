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
}

export default function ContactModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedContact,
}: ContactModalProps) {
  const [contact, setContact] = useState<Contact>({
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
  });

  useEffect(() => {
    if (selectedContact) {
      setContact(selectedContact);
    } else {
      setContact({
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
      });
    }
  }, [selectedContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(contact);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  {selectedContact ? "Modifier le contact" : "Nouveau contact"}
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.nom}
                        onChange={(e) =>
                          setContact({ ...contact, nom: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prénom
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.prenom}
                        onChange={(e) =>
                          setContact({ ...contact, prenom: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contact.email}
                        onChange={(e) =>
                          setContact({ ...contact, email: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        required
                        value={contact.telephone}
                        onChange={(e) =>
                          setContact({ ...contact, telephone: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Entreprise
                    </label>
                    <input
                      type="text"
                      value={contact.entreprise}
                      onChange={(e) =>
                        setContact({ ...contact, entreprise: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={contact.adresse}
                      onChange={(e) =>
                        setContact({ ...contact, adresse: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={contact.codePostal}
                        onChange={(e) =>
                          setContact({ ...contact, codePostal: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={contact.ville}
                        onChange={(e) =>
                          setContact({ ...contact, ville: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={contact.notes}
                      onChange={(e) =>
                        setContact({ ...contact, notes: e.target.value })
                      }
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    {selectedContact && onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(contact)}
                        className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      >
                        Supprimer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
