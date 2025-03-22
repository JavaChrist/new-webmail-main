"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/config/firebase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Réinitialiser les champs quand le composant est monté
  useEffect(() => {
    setEmail("");
    setPassword("");
    setError(null);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // La redirection sera gérée par le useEffect
    } catch (err: any) {
      setError("Échec de connexion : " + err.message);
      // Réinitialiser le mot de passe en cas d'erreur
      setPassword("");
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // La redirection sera gérée par le useEffect
    } catch (error: any) {
      setError("Erreur avec Google : " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-gray-900 text-white p-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Connexion</h1>
      <form
        onSubmit={handleLogin}
        className="flex flex-col space-y-4"
        autoComplete="new-password"
        spellCheck="false"
      >
        <div className="relative">
          <input
            type="email"
            name="email-no-autofill"
            placeholder="Email"
            className="bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            required
          />
        </div>
        <div className="relative">
          <input
            type="password"
            name="password-no-autofill"
            placeholder="Mot de passe"
            className="bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoCorrect="off"
            spellCheck="false"
            required
          />
        </div>
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
