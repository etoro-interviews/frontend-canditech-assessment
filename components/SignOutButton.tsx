"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";

export function SignOutButton() {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        await api("/api/auth/sign-out", { method: "POST" });
        router.push("/sign-in");
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
