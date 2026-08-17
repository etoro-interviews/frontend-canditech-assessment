"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineTitle } from "@/components/ui/InlineTitle";
import { useToast } from "@/components/ui/Toast";
import { api, errorCode, errorKey } from "@/lib/api/client";
import type { Board, WorkspaceDetail } from "@/lib/api/types";

export function WorkspaceHomeClient({
  workspace,
  boards: initialBoards,
}: {
  workspace: WorkspaceDetail;
  boards: Board[];
}) {
  const t = useTranslations("boards");
  const tw = useTranslations("workspaces");
  const te = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [boards, setBoards] = useState(initialBoards);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { board } = await api<{ board: Board }>(
        `/api/workspaces/${workspace.slug}/boards`,
        { method: "POST", body: JSON.stringify({ name }) },
      );
      router.push(`/workspaces/${workspace.slug}/boards/${board.slug}`);
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onRenameBoard(board: Board, nextName: string) {
    try {
      const { board: updated } = await api<{ board: Board }>(
        `/api/boards/${board.id}`,
        { method: "PATCH", body: JSON.stringify({ name: nextName }) },
      );
      setBoards((prev) =>
        prev.map((b) =>
          b.id === board.id ? { ...b, name: updated.name } : b,
        ),
      );
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      throw err;
    }
  }

  async function onArchiveBoard(board: Board) {
    if (!window.confirm(t("confirmArchive"))) return;
    setPending(true);
    try {
      await api(`/api/boards/${board.id}`, { method: "DELETE" });
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/workspaces"
        className="inline-block text-sm text-[var(--accent)]"
      >
        ← {tw("backToList")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <p className="text-sm text-[var(--muted)]">
            {workspace.role} · {workspace.memberCount}
          </p>
        </div>
        <Link href={`/workspaces/${workspace.slug}/settings`}>
          <Button type="button" variant="ghost">
            {tw("settings")}
          </Button>
        </Link>
      </div>

      <form onSubmit={onCreate} className="flex max-w-md gap-2">
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

      {boards.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h2 className="font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <InlineTitle
                    value={board.name}
                    className="block font-medium"
                    onSave={(next) => onRenameBoard(board, next)}
                  />
                  <Link
                    href={`/workspaces/${workspace.slug}/boards/${board.slug}`}
                    className="mt-2 inline-block text-sm text-[var(--accent)]"
                  >
                    {tw("open")}
                  </Link>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onArchiveBoard(board)}
                  className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                  title={t("archive")}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
