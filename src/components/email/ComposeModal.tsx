"use client";

import { useState, useEffect, useRef } from "react";
import { X, Paperclip, Trash2 } from "lucide-react";
import { Dialog as HeadlessDialog } from "@headlessui/react";
import { useTheme } from "@/context/ThemeContext";
import { Editor } from "@tinymce/tinymce-react";
import * as Toast from "@radix-ui/react-toast";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: {
    to: string;
    subject: string;
    content: string;
    attachments?: File[];
  }) => Promise<void>;
  initialData?: {
    to: string;
    subject: string;
    content: string;
  } | null;
}

export default function ComposeModal({
  isOpen,
  onClose,
  onSend,
  initialData,
}: ComposeModalProps) {
  const { isDarkMode } = useTheme();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("error");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTo(initialData.to);
      setSubject(initialData.subject);
      setContent(initialData.content);
    } else {
      setTo("");
      setSubject("");
      setContent("");
    }
    setAttachments([]);
  }, [initialData]);

  const resetForm = () => {
    setTo("");
    setSubject("");
    setContent("");
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Valeurs du formulaire:", { to, subject, content });

    if (!to || !subject || !content) {
      setToastMessage("Veuillez remplir tous les champs obligatoires");
      setToastType("error");
      setShowToast(true);
      return;
    }

    setIsSending(true);
    try {
      const emailData = { to, subject, content, attachments };
      console.log("Données envoyées:", emailData);
      await onSend(emailData);
      setToastMessage("Email envoyé avec succès");
      setToastType("success");
      setShowToast(true);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi de l'email"
      );
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const maxSize = 25 * 1024 * 1024; // 25 MB

    if (totalSize > maxSize) {
      setToastMessage(
        "La taille totale des pièces jointes ne doit pas dépasser 25 MB"
      );
      setToastType("error");
      setShowToast(true);
      return;
    }

    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <>
      <HeadlessDialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <HeadlessDialog.Panel className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <HeadlessDialog.Title className="text-xl font-semibold text-white">
                Nouveau message
              </HeadlessDialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    À
                  </label>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="destinataire@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Objet
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Objet du message"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Message
                  </label>
                  <Editor
                    apiKey=""
                    value={content}
                    onEditorChange={(content) => setContent(content)}
                    init={{
                      height: 300,
                      menubar: false,
                      plugins: [
                        "advlist",
                        "autolink",
                        "lists",
                        "link",
                        "image",
                        "charmap",
                        "preview",
                        "anchor",
                        "searchreplace",
                        "visualblocks",
                        "code",
                        "fullscreen",
                        "insertdatetime",
                        "media",
                        "table",
                        "code",
                        "help",
                        "wordcount",
                      ],
                      toolbar:
                        "undo redo | blocks | " +
                        "bold italic backcolor | alignleft aligncenter " +
                        "alignright alignjustify | bullist numlist outdent indent | " +
                        "removeformat | help",
                      content_style:
                        "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                      skin: isDarkMode ? "oxide-dark" : "oxide",
                      content_css: isDarkMode ? "dark" : "default",
                      promotion: false,
                      branding: false,
                      base_url: "/tinymce",
                      suffix: ".min",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Pièces jointes
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Paperclip size={16} />
                      <span>Ajouter des pièces jointes</span>
                    </button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-800 p-2 rounded-lg"
                        >
                          <span className="text-sm text-gray-300">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? "Envoi en cours..." : "Envoyer"}
                </button>
              </div>
            </form>
          </HeadlessDialog.Panel>
        </div>
      </HeadlessDialog>

      <Toast.Provider>
        <Toast.Root
          open={showToast}
          onOpenChange={setShowToast}
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          <Toast.Title className="font-medium">{toastMessage}</Toast.Title>
        </Toast.Root>
      </Toast.Provider>
    </>
  );
}
