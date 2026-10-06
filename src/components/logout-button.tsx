"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "./ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await callApi("/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <Button onClick={handleLogout} disabled={pending}>
      {pending ? copy.auth.loggingOut : copy.auth.logOut}
    </Button>
  );
}
