"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineTitle } from "@/components/ui/InlineTitle";
import { useToast } from "@/components/ui/Toast";
import { api, errorCode, errorKey } from "@/lib/api/client";
import { midpoint, nextAppendPosition } from "@/lib/api/position";
import type { BoardPage, CardSummary, ListWithCards } from "@/lib/api/types";

function SortableCard({
  card,
  onRename,
  onArchive,
  archiveLabel,
  dragLabel,
}: {
  card: CardSummary;
  onRename: (title: string) => Promise<void>;
  onArchive: () => void;
  archiveLabel: string;
  dragLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: card.id, data: { type: "card", listId: card.listId } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1 rounded-[var(--radius)] bg-[var(--surface)] p-2 text-sm shadow-[var(--shadow)]"
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-[var(--muted)] active:cursor-grabbing"
        aria-label={dragLabel}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">
        <InlineTitle
          value={card.title}
          className="block w-full text-left text-sm"
          inputClassName="text-sm"
          onSave={onRename}
        />
      </div>
      <button
        type="button"
        onClick={onArchive}
        className="shrink-0 text-xs text-[var(--muted)] opacity-0 hover:text-[var(--danger)] group-hover:opacity-100"
        title={archiveLabel}
      >
        ×
      </button>
    </li>
  );
}

export function BoardShell({
  workspaceSlug,
  initial,
}: {
  workspaceSlug: string;
  initial: BoardPage;
}) {
  const t = useTranslations("cards");
  const tl = useTranslations("lists");
  const tb = useTranslations("boards");
  const ta = useTranslations("a11y");
  const te = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [boardPage, setBoardPage] = useState(initial);
  const [listName, setListName] = useState("");
  const [cardDrafts, setCardDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cardIdsByList = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const list of boardPage.lists) {
      map[list.id] = list.cards.map((c) => c.id);
    }
    return map;
  }, [boardPage.lists]);

  async function refresh() {
    const { boardPage: next } = await api<{ boardPage: BoardPage }>(
      `/api/boards/${boardPage.board.id}`,
    );
    setBoardPage(next);
  }

  async function onRenameBoard(name: string) {
    try {
      const { board } = await api<{
        board: { id: string; name: string; slug: string };
      }>(`/api/boards/${boardPage.board.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setBoardPage((prev) => ({
        ...prev,
        board: { ...prev.board, name: board.name },
      }));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      throw err;
    }
  }

  async function onArchiveBoard() {
    if (!window.confirm(tb("confirmArchive"))) return;
    setPending(true);
    try {
      await api(`/api/boards/${boardPage.board.id}`, { method: "DELETE" });
      router.push(`/workspaces/${workspaceSlug}`);
      router.refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onRenameList(listId: string, name: string) {
    try {
      await api(`/api/lists/${listId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setBoardPage((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, name } : l,
        ),
      }));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      throw err;
    }
  }

  async function onArchiveList(listId: string) {
    if (!window.confirm(tl("confirmArchive"))) return;
    setPending(true);
    try {
      await api(`/api/lists/${listId}`, { method: "DELETE" });
      setBoardPage((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      }));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onRenameCard(cardId: string, title: string) {
    try {
      await api(`/api/cards/${cardId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setBoardPage((prev) => ({
        ...prev,
        lists: prev.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            c.id === cardId ? { ...c, title } : c,
          ),
        })),
      }));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      throw err;
    }
  }

  async function onArchiveCard(cardId: string, listId: string) {
    if (!window.confirm(t("confirmArchive"))) return;
    setPending(true);
    try {
      await api(`/api/cards/${cardId}`, { method: "DELETE" });
      setBoardPage((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId
            ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) }
            : l,
        ),
      }));
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onAddList(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api(`/api/boards/${boardPage.board.id}/lists`, {
        method: "POST",
        body: JSON.stringify({ name: listName }),
      });
      setListName("");
      await refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onAddCard(listId: string, e: FormEvent) {
    e.preventDefault();
    const title = cardDrafts[listId]?.trim();
    if (!title) return;
    setPending(true);
    try {
      await api(`/api/lists/${listId}/cards`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setCardDrafts((d) => ({ ...d, [listId]: "" }));
      await refresh();
    } catch (err) {
      push(te(errorKey(errorCode(err))));
    } finally {
      setPending(false);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    let fromListId = "";
    let toListId = "";
    let fromIndex = -1;
    let toIndex = -1;

    for (const list of boardPage.lists) {
      const idx = list.cards.findIndex((c) => c.id === activeId);
      if (idx >= 0) {
        fromListId = list.id;
        fromIndex = idx;
      }
      const overIdx = list.cards.findIndex((c) => c.id === overId);
      if (overIdx >= 0) {
        toListId = list.id;
        toIndex = overIdx;
      }
      if (overId === list.id) {
        toListId = list.id;
        toIndex = list.cards.length;
      }
    }
    if (!fromListId || !toListId || fromIndex < 0) return;

    const nextLists: ListWithCards[] = boardPage.lists.map((l) => ({
      ...l,
      cards: [...l.cards],
    }));
    const fromList = nextLists.find((l) => l.id === fromListId)!;
    const toList = nextLists.find((l) => l.id === toListId)!;
    const [moved] = fromList.cards.splice(fromIndex, 1);
    if (!moved) return;

    const insertAt =
      fromListId === toListId && toIndex > fromIndex ? toIndex - 1 : toIndex;
    toList.cards.splice(Math.max(0, insertAt), 0, {
      ...moved,
      listId: toListId,
    });

    if (fromListId === toListId) {
      toList.cards = arrayMove(toList.cards, insertAt, insertAt);
    }

    const cards = toList.cards;
    const idx = cards.findIndex((c) => c.id === activeId);
    const prev = cards[idx - 1];
    const next = cards[idx + 1];
    let position: number;
    if (!prev && !next) position = 1000;
    else if (!prev && next) position = Number(next.position) / 2;
    else if (prev && !next) position = nextAppendPosition(prev.position);
    else position = midpoint(prev!.position, next!.position);

    cards[idx] = { ...cards[idx]!, position };
    setBoardPage({ ...boardPage, lists: nextLists });

    try {
      await api(`/api/cards/${activeId}/move`, {
        method: "POST",
        body: JSON.stringify({ listId: toListId, position }),
      });
    } catch (err) {
      push(te(errorKey(errorCode(err))));
      await refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <InlineTitle
          as="h1"
          value={boardPage.board.name}
          className="text-2xl font-semibold"
          inputClassName="text-2xl font-semibold"
          onSave={onRenameBoard}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => void onArchiveBoard()}
          >
            {tb("archive")}
          </Button>
          <Link
            href={`/workspaces/${workspaceSlug}`}
            className="text-sm text-[var(--accent)]"
          >
            ← {tb("backToWorkspace")}
          </Link>
        </div>
      </div>

      {boardPage.lists.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h2 className="font-medium">{t("emptyBoardTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("emptyBoardBody")}</p>
          <form onSubmit={onAddList} className="mx-auto mt-4 flex max-w-sm gap-2">
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={tl("namePlaceholder")}
              required
            />
            <Button type="submit" disabled={pending}>
              {t("emptyBoardCta")}
            </Button>
          </form>
        </div>
      ) : (
        <DndContext
          // dnd-kit derives its aria-describedby id from a module-level
          // counter, which drifts between the long-lived server process and a
          // fresh browser load and breaks hydration. An explicit id pins it.
          id="board-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {boardPage.lists.map((list) => (
              <div
                key={list.id}
                id={list.id}
                className="w-[272px] shrink-0 rounded-[var(--radius)] bg-[#ebecf0] p-3"
              >
                <div className="mb-2 flex items-start gap-1">
                  <InlineTitle
                    as="h3"
                    value={list.name}
                    className="flex-1 text-sm font-semibold"
                    inputClassName="text-sm font-semibold"
                    onSave={(name) => onRenameList(list.id, name)}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onArchiveList(list.id)}
                    className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                    title={tl("archive")}
                  >
                    ×
                  </button>
                </div>
                <SortableContext
                  items={cardIdsByList[list.id] ?? []}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="min-h-8 space-y-2">
                    {list.cards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        archiveLabel={t("archive")}
                        dragLabel={ta("drag")}
                        onRename={(title) => onRenameCard(card.id, title)}
                        onArchive={() => void onArchiveCard(card.id, list.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
                <form
                  onSubmit={(e) => onAddCard(list.id, e)}
                  className="mt-2 space-y-2"
                >
                  <Input
                    value={cardDrafts[list.id] ?? ""}
                    onChange={(e) =>
                      setCardDrafts((d) => ({ ...d, [list.id]: e.target.value }))
                    }
                    placeholder={t("titlePlaceholder")}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full"
                    disabled={pending}
                  >
                    {t("add")}
                  </Button>
                </form>
              </div>
            ))}
            <form onSubmit={onAddList} className="w-[272px] shrink-0 space-y-2">
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder={tl("namePlaceholder")}
                required
              />
              <Button type="submit" disabled={pending} className="w-full">
                {tl("add")}
              </Button>
            </form>
          </div>
        </DndContext>
      )}
    </div>
  );
}
