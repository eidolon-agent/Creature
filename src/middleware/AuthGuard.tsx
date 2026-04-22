"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { createClient } from "@/lib/supabase/supabase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useFarcasterUser();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const publicPaths = ["/", "/landing", "/signup", "/api"];
    const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

    if (isPublicPath) {
      setChecking(false);
      return;
    }

    if (!user) {
      setShouldRedirect(true);
      return;
    }

    const checkPlayerExists = async () => {
      try {
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("fid", user.fid)
          .single();

        if (!data) {
          // Player doesn't exist, redirect to signup
          router.push("/signup");
        }
      } catch (err) {
        // Player doesn't exist or other error
        router.push("/signup");
      } finally {
        setChecking(false);
      }
    };

    checkPlayerExists();
  }, [user, isLoading, pathname, router, supabase]);

  if (checking || shouldRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6" />
          <p className="text-2xl text-purple-300">Summoning your hero...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
