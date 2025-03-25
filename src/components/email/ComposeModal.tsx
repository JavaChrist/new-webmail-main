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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !content) return;

    setIsSending(true);
    try {
      await onSend({ to, subject, content, attachments });
      onClose();
      // Réinitialiser le formulaire
      setTo("");
      setSubject("");
      setContent("");
      setAttachments([]);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      setToastMessage("Erreur lors de l'envoi de l'email");
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
          <HeadlessDialog.Panel
            className={`w-full max-w-4xl p-6 rounded-lg shadow-xl ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <HeadlessDialog.Title className="text-xl font-bold">
                Nouveau message
              </HeadlessDialog.Title>
              <button
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="À"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-700 text-white placeholder-gray-400"
                      : "bg-gray-50 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Objet"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-700 text-white placeholder-gray-400"
                      : "bg-gray-50 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                />
              </div>

              <div className="min-h-[400px]">
                <Editor
                  apiKey="votre-clé-api-tinymce"
                  value={content}
                  onEditorChange={(newContent: string) =>
                    setContent(newContent)
                  }
                  init={{
                    height: 400,
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
                      "bold italic forecolor | alignleft aligncenter " +
                      "alignright alignjustify | bullist numlist outdent indent | " +
                      "removeformat | help",
                    skin: isDarkMode ? "oxide-dark" : "oxide",
                    content_css: isDarkMode ? "dark" : "default",
                  }}
                />
              </div>

              <div>
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  <Paperclip size={20} />
                  <span>Ajouter des pièces jointes</span>
                </button>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
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
    </>
  );
}
