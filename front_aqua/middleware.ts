import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("staff_token")?.value;
  const role = request.cookies.get("staff_role")?.value;

  // Додаємо /cashier сюди:
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/cashier");

  // 1. Немає токена, але лізе на захищену сторінку -> на /login
  if (!token && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Якщо не адмін намагається відкрити /admin -> редирект на сканер касира
  if (token && pathname.startsWith("/admin") && role !== "Admin") {
    return NextResponse.redirect(new URL("/cashier/scanner", request.url));
  }

  return NextResponse.next();
}

// Додаємо /cashier/:path* до matcher:
export const config = {
  matcher: ["/admin/:path*", "/cashier/:path*", "/login"],
};