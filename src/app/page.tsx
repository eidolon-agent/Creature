"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/landing");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6" />
        <p className="text-2xl text-purple-300">Summoning portal...</p>
      </div>
    </div>
  );
}
