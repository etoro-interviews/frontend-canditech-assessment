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

export function WorkspaceSettingsClient({
  workspace,
}: {
  workspace: WorkspaceDetail;
}) {
  const t = useTranslations("workspaces");
  const tc = useTranslations("common");
  const te = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState(workspace.name);
  const [pending, setPending] = useState(false);
  const isOwner = workspace.role === "owner";

  async function onRename(e: FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setPending(true);
    try {
      await api(`/api/workspaces/${workspace.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      push(t("saved"));
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!isOwner) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setPending(true);
    try {
      await api(`/api/workspaces/${workspace.slug}`, { method: "DELETE" });
      router.push("/workspaces");
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <Link
          href={`/workspaces/${workspace.slug}`}
          className="mb-3 inline-block text-sm text-[var(--accent)]"
        >
          ← {t("backToWorkspace")}
        </Link>
        <h1 className="text-2xl font-semibold">{t("settings")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settingsPending")}</p>
      </div>

      {!isOwner ? (
        <p className="text-sm text-[var(--muted)]">{t("ownerOnly")}</p>
      ) : (
        <>
          <form onSubmit={onRename} className="space-y-3">
            <label className="block text-sm font-medium">{t("rename")}</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
              />
              <Button type="submit" disabled={pending}>
                {tc("save")}
              </Button>
            </div>
          </form>

          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--danger)]/30 p-4">
            <h2 className="text-sm font-medium text-[var(--danger)]">
              {t("delete")}
            </h2>
            <p className="text-sm text-[var(--muted)]">{t("confirmDelete")}</p>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => void onDelete()}
            >
              {t("delete")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
