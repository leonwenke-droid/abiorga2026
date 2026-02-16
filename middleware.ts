import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Admin-Bereich nur mit Login zugänglich
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const supabase = createMiddlewareClient({ req, res });
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set(
        "redirectTo",
        req.nextUrl.pathname + req.nextUrl.search
      );
      return NextResponse.redirect(redirectUrl);
    }
    
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"]
};

