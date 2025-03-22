"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import Sidebar from "@/components/Sidebar";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser && pathname !== "/login") {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // Pendant le chargement initial, on affiche un écran de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté et qu'on n'est pas sur la page de login
  if (!user && pathname !== "/login") {
    return null;
  }

  // Si l'utilisateur est connecté et qu'il est sur la page de login
  if (user && pathname === "/login") {
    router.push("/");
    return null;
  }

  return (
    <div className="flex flex-1">
      {user && pathname !== "/login" && <Sidebar />}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
