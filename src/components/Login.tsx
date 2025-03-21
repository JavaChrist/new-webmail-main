"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/config/firebase";

export default function Login() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // ✅ Purger les champs quand l'utilisateur arrive sur /login
  useEffect(() => {
    if (pathname === "/login") {
      setEmail("temp-value");
      setPassword("temp-value");

      setTimeout(() => {
        setEmail("");
        setPassword("");
      }, 50);
    }
  }, [pathname]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/app");
    } catch (err: any) {
      setError("Échec de connexion : " + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/app");
    } catch (error: any) {
      setError("Erreur avec Google : " + error.message);
    }
  };

  return (
    <div className="w-full max-w-md bg-gray-900 text-white p-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Connexion</h1>
      <form onSubmit={handleLogin} className="flex flex-col space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Se connecter
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition w-full"
      >
        Connexion avec Google
      </button>

      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </div>
  );
}
