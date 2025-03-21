"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../config/firebase";
import * as Lucide from "lucide-react";

export default function EmailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login"); // Redirection si non connecté
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <p className="text-center mt-10">Chargement...</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-400 flex items-center space-x-3">
        <Lucide.Mail size={32} /> <span>Boîte de réception</span>
      </h1>
      <p className="mt-4 text-gray-500">Consultez et envoyez vos emails.</p>
    </div>
  );
}
