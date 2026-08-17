"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, errorCode, errorKey } from "@/lib/api/client";
import type { WorkspaceDetail } from "@/lib/api/types";

export function WorkspacesClient({
  initial,
}: {
  initial: WorkspaceDetail[];
}) {
  const t = useTranslations("workspaces");
  const tb = useTranslations("boards");
  const te = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { workspace } = await api<{ workspace: WorkspaceDetail }>(
        "/api/workspaces",
        { method: "POST", body: JSON.stringify({ name }) },
      );
      router.push(`/workspaces/${workspace.slug}`);
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <form onSubmit={onCreate} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            required
          />
          <Button type="submit" disabled={pending}>
            {t("create")}
          </Button>
        </form>
      </div>

      {initial.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{tb("emptyBody")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((ws) => (
            <li key={ws.id}>
              <Link
                href={`/workspaces/${ws.slug}`}
                className="block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] hover:border-[var(--accent)]"
              >
                <div className="font-medium">{ws.name}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {ws.role} · {ws.memberCount}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
