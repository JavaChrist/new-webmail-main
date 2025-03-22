import { NextRequest, NextResponse } from "next/server";
import { adminApp } from "@/config/firebase-admin";
import { getAuth } from "firebase-admin/auth";

// Liste des routes protégées qui nécessitent une authentification
const PROTECTED_ROUTES = ["/emails", "/contacts", "/calendar", "/"];
const API_ROUTES = ["/api/email/"];

export async function middleware(req: NextRequest) {
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) =>
      req.nextUrl.pathname === route ||
      req.nextUrl.pathname.startsWith(route + "/")
  );
  const isApiRoute = API_ROUTES.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Vérifier d'abord le header Bearer pour les requêtes API
  const authHeader = req.headers.get("authorization");
  let token = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else {
    // Sinon, vérifier le cookie pour les pages web
    token = req.cookies.get("token")?.value || null;
  }

  // Si l'utilisateur n'est pas authentifié
  if (!token) {
    // Si c'est une route protégée ou une API
    if (isProtectedRoute || isApiRoute) {
      // Si c'est une requête API, renvoyer une erreur 401
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Token d'authentification requis" },
          { status: 401 }
        );
      }
      // Sinon, rediriger vers la page de connexion
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Si c'est une route publique, laisser passer
    return NextResponse.next();
  }

  try {
    // Vérifier la validité du token
    await getAuth().verifyIdToken(token);

    // Si l'utilisateur est authentifié et qu'il essaie d'accéder à /login
    if (req.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/emails", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token invalide
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Token d'authentification invalide" },
        { status: 401 }
      );
    }
    // Pour les pages web, rediriger vers login
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }
}

// Protéger toutes les routes nécessaires
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (API routes for authentication)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
