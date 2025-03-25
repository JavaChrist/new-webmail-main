"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import * as Lucide from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { EmailAccount } from "@/components/email/EmailAccountModal";

export default function EmailsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        await loadEmailAccounts(currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadEmailAccounts = async (userId: string) => {
    try {
      const accountsRef = collection(db, "emailAccounts");
      const q = query(accountsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      const accounts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmailAccount[];

      setEmailAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des comptes email:", error);
    }
  };

  const syncEmails = async () => {
    if (!auth.currentUser || !selectedAccount) {
      setToastMessage(
        "Veuillez sélectionner un compte email pour synchroniser"
      );
      setShowToast(true);
      return;
    }

    setIsSyncing(true);
    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/email/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          accountId: selectedAccount.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la synchronisation");
      }

      setToastMessage("Synchronisation réussie");
      setShowToast(true);
    } catch (error) {
      console.error("Erreur lors de la synchronisation des emails:", error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Erreur lors de la synchronisation"
      );
      setShowToast(true);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <p className="text-center mt-10">Chargement...</p>;

  if (emailAccounts.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center space-x-3">
          <Lucide.Mail size={32} /> <span>Boîte de réception</span>
        </h1>
        <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
            Aucun compte email configuré
          </h2>
          <p className="mt-2 text-yellow-700 dark:text-yellow-300">
            Pour commencer à utiliser la messagerie, vous devez d'abord
            configurer au moins un compte email.
          </p>
          <button
            onClick={() => router.push("/email/accounts")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configurer un compte email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center space-x-3">
          <Lucide.Mail size={32} /> <span>Boîte de réception</span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={syncEmails}
            disabled={isSyncing || !selectedAccount}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
            } ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
            title="Synchroniser les emails"
          >
            <Lucide.RefreshCw
              size={20}
              className={`${isSyncing ? "animate-spin" : ""}`}
            />
          </button>
          <select
            value={selectedAccount?.id || ""}
            onChange={(e) => {
              const account = emailAccounts.find(
                (a) => a.id === e.target.value
              );
              if (account) setSelectedAccount(account);
            }}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
            } border ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}
          >
            {emailAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-4 text-gray-500">
        Compte sélectionné : {selectedAccount?.email}
      </p>

      {showToast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
