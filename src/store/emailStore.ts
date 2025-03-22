import { create } from "zustand";

interface NewEmailState {
  to: string;
  subject: string;
  content: string;
  setNewEmail: (to: string, subject?: string, content?: string) => void;
  resetNewEmail: () => void;
}

export const useNewEmailStore = create<NewEmailState>((set) => ({
  to: "",
  subject: "",
  content: "",
  setNewEmail: (to: string, subject: string = "", content: string = "") =>
    set({ to, subject, content }),
  resetNewEmail: () => set({ to: "", subject: "", content: "" }),
}));
