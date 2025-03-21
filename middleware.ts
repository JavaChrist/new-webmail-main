import { NextRequest, NextResponse } from "next/server";
import { adminApp } from "@/config/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function middleware(req: NextRequest) {
  // Vérifier d'abord le header Bearer pour les requêtes API
  const authHeader = req.headers.get("authorization");
  let token = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else {
    // Sinon, vérifier le cookie pour les pages web
    token = req.cookies.get("token")?.value || null;
  }

  if (!token) {
    // Si c'est une requête API, renvoyer une erreur 401
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Token d'authentification requis" },
        { status: 401 }
      );
    }
    // Sinon, rediriger vers la page de connexion
    if (req.nextUrl.pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  try {
    await getAuth().verifyIdToken(token);

    // Si l'utilisateur est déjà connecté et qu'il va sur `/login`, on le redirige vers `/emails`
    if (req.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/emails", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Si c'est une requête API, renvoyer une erreur 401
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }
    // Sinon, rediriger vers la page de connexion
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Protéger toutes les routes nécessaires
export const config = {
  matcher: ["/", "/emails", "/contacts", "/calendar", "/api/email/:path*"],
};
