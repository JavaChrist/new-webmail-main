"use client"; // ✅ Obligatoire pour `useEffect` et `useState`

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/config/firebase";
import { Mail, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UnreadEmail {
  id: string;
  from: string;
  subject: string;
  timestamp: Date;
  read: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const [unreadEmails, setUnreadEmails] = useState<UnreadEmail[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        setIsLoading(false);
        loadUnreadEmails(user.uid);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadUnreadEmails = async (userId: string) => {
    try {
      const emailsRef = collection(db, "emails");
      const q = query(
        emailsRef,
        where("userId", "==", userId),
        where("folder", "==", "inbox"),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const emails = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          from: doc.data().from,
          subject: doc.data().subject,
          timestamp: doc.data().timestamp.toDate(),
          read: doc.data().read,
        }))
        .filter((email) => !email.read);

      setUnreadEmails(emails);
    } catch (error) {
      console.error("Erreur lors du chargement des emails non lus:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const features = [
    {
      title: "Messagerie",
      description: "Gérez vos emails professionnels",
      icon: Mail,
      href: "/email",
    },
    {
      title: "Calendrier",
      description: "Organisez vos rendez-vous",
      icon: Calendar,
      href: "/calendar",
    },
    {
      title: "Contacts",
      description: "Gérez votre carnet d'adresses",
      icon: Users,
      href: "/contacts",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1
        className={`text-3xl font-bold mb-8 ${
          isDarkMode ? "text-white" : "text-blue-900"
        }`}
      >
        Bienvenue dans votre WebMail
      </h1>

      {/* Grille des fonctionnalités */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className={`p-6 rounded-lg transition-all transform hover:scale-105 ${
              isDarkMode
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-white hover:bg-gray-50 shadow-lg"
            }`}
          >
            <div className="flex items-center gap-4">
              <feature.icon
                size={24}
                className={isDarkMode ? "text-blue-400" : "text-blue-600"}
              />
              <div>
                <h2
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {feature.title}
                </h2>
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                  {feature.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Section des emails non lus */}
      {unreadEmails.length > 0 && (
        <div
          className={`p-6 rounded-lg ${
            isDarkMode ? "bg-gray-800" : "bg-white shadow-lg"
          }`}
        >
          <h2
            className={`text-xl font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Emails non lus récents
          </h2>
          <div className="space-y-3">
            {unreadEmails.map((email) => (
              <div
                key={email.id}
                className={`p-4 rounded-lg ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-50 hover:bg-gray-100"
                } transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {email.from}
                    </p>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {email.subject}
                    </p>
                  </div>
                  <span
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {format(email.timestamp, "d MMM HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>
            ))}
            <Link
              href="/email"
              className={`block text-center mt-4 text-sm ${
                isDarkMode
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              Voir tous les emails
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
