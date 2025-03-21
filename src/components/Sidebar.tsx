"use client";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  Calendar,
  Mail,
  Users,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/config/firebase";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/calendar", icon: Calendar, label: "Calendrier" },
  { href: "/email", icon: Mail, label: "Email" },
  { href: "/contacts", icon: Users, label: "Contacts" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <>
      {/* Overlay pour fermer le menu sur mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bouton pour ouvrir/fermer le menu sur mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">WebMail</h1>
            <button onClick={() => setIsOpen(false)} className="lg:hidden">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            <ul className="space-y-2">
              {menuItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      pathname === href ? "bg-blue-600" : "hover:bg-gray-700"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer avec boutons de thème et déconnexion */}
          <div className="space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span>{isDarkMode ? "Mode clair" : "Mode sombre"}</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors text-red-400"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
