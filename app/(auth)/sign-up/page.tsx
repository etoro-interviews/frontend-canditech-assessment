"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, errorCode, errorKey } from "@/lib/api/client";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const te = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      await api("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          name: form.get("name"),
        }),
      });
      router.push("/workspaces");
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
      >
        <h1 className="text-xl font-semibold">{t("signUpTitle")}</h1>
        <label className="block space-y-1 text-sm">
          <span>{t("name")}</span>
          <Input name="name" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("email")}</span>
          <Input name="email" type="email" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("password")}</span>
          <Input name="password" type="password" required minLength={6} />
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {t("signUp")}
        </Button>
        <p className="text-center text-sm text-[var(--muted)]">
          {t("hasAccount")}{" "}
          <Link href="/sign-in" className="text-[var(--accent)]">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </div>
  );
}
