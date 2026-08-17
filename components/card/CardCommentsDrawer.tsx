"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, errorCode, errorKey } from "@/lib/api/client";
import type { CardComment } from "@/lib/api/types";

const MAX_PREVIEW = 280;

export function CardCommentsDrawer({
  cardId,
  cardTitle,
  currentUserId,
  onClose,
}: {
  cardId: string;
  cardTitle: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const { push } = useToast();
  const [comments, setComments] = useState<CardComment[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { comments: rows } = await api<{ comments: CardComment[] }>(
          `/api/cards/${cardId}/comments`,
        );
        if (!cancelled) setComments(rows);
      } catch (err) {
        push(errorKey(errorCode(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId, push]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPending(true);
    try {
      const { comment } = await api<{ comment: CardComment }>(
        `/api/cards/${cardId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body, authorId: currentUserId }),
        },
      );
      setComments((prev) => [...prev, comment]);
      setDraft("");
    } catch (err) {
      push(errorKey(errorCode(err)));
    } finally {
      setPending(false);
    }
  }

  async function onDelete(comment: CardComment) {
    // Only the author can remove their own notes from the UI.
    if (comment.authorId !== currentUserId) return;
    setPending(true);
    try {
      await api(`/api/comments/${comment.id}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err) {
      push(errorKey(errorCode(err)));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)]">Comments</div>
          <h2 className="truncate font-semibold">{cardTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Close
        </button>
      </div>

      <ul className="flex-1 space-y-3 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No comments yet 💬</li>
        ) : (
          comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-[var(--radius)] border border-[var(--border)] p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <span>{comment.author?.name ?? "Member"}</span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html:
                    comment.body.length > MAX_PREVIEW
                      ? `${comment.body.slice(0, MAX_PREVIEW)}…`
                      : comment.body,
                }}
              />
              {comment.authorId === currentUserId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onDelete(comment)}
                  className="mt-2 text-xs text-[var(--danger)]"
                >
                  Delete
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <form
        onSubmit={onSubmit}
        className="space-y-2 border-t border-[var(--border)] p-4"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
        />
        <Button type="submit" disabled={pending} className="w-full">
          Add comment
        </Button>
      </form>
    </div>
  );
}
