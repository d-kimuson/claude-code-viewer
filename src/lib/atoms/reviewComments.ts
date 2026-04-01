import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useCallback, useMemo } from "react";
import { z } from "zod";

const lineTypeSchema = z.enum([
  "added",
  "deleted",
  "unchanged",
  "hunk",
  "context",
]);

const reviewCommentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  lineNumber: z.number(),
  lineType: lineTypeSchema,
  content: z.string(),
  createdAt: z.number(),
});

export type ReviewComment = z.infer<typeof reviewCommentSchema>;

const reviewCommentStoreSchema = z.record(
  z.string(),
  z.array(reviewCommentSchema),
);

export type ReviewCommentStore = z.infer<typeof reviewCommentStoreSchema>;

export const sanitizeReviewCommentStore = (
  value: unknown,
  fallback: ReviewCommentStore,
): ReviewCommentStore => {
  const result = reviewCommentStoreSchema.safeParse(value);
  return result.success ? result.data : fallback;
};

export const addCommentToStore = (
  store: ReviewCommentStore,
  sessionId: string,
  comment: ReviewComment,
): ReviewCommentStore => ({
  ...store,
  [sessionId]: [...(store[sessionId] ?? []), comment],
});

export const removeCommentFromStore = (
  store: ReviewCommentStore,
  sessionId: string,
  commentId: string,
): ReviewCommentStore => {
  const comments = store[sessionId] ?? [];
  const filtered = comments.filter((c) => c.id !== commentId);

  if (filtered.length === 0) {
    const { [sessionId]: _removed, ...rest } = store;
    return rest;
  }

  return {
    ...store,
    [sessionId]: filtered,
  };
};

export const clearCommentsFromStore = (
  store: ReviewCommentStore,
  sessionId: string,
): ReviewCommentStore => {
  const { [sessionId]: _removed, ...rest } = store;
  return rest;
};

const baseStorage = createJSONStorage<ReviewCommentStore>(() => localStorage);

const reviewCommentStorage = {
  getItem: (key: string, initialValue: ReviewCommentStore) =>
    sanitizeReviewCommentStore(
      baseStorage.getItem(key, initialValue),
      initialValue,
    ),
  setItem: (key: string, newValue: ReviewCommentStore) =>
    baseStorage.setItem(key, newValue),
  removeItem: (key: string) => baseStorage.removeItem(key),
};

const reviewCommentsAtom = atomWithStorage<ReviewCommentStore>(
  "claude-code-viewer-review-comments",
  {},
  reviewCommentStorage,
);

export const useReviewComments = (sessionId: string) => {
  const [store, setStore] = useAtom(reviewCommentsAtom);
  const comments: readonly ReviewComment[] = useMemo(
    () => store[sessionId] ?? [],
    [store, sessionId],
  );

  const addComment = useCallback(
    (comment: Omit<ReviewComment, "id" | "createdAt">) => {
      const newComment: ReviewComment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setStore((prev) => addCommentToStore(prev, sessionId, newComment));
    },
    [sessionId, setStore],
  );

  const removeComment = useCallback(
    (commentId: string) => {
      setStore((prev) => removeCommentFromStore(prev, sessionId, commentId));
    },
    [sessionId, setStore],
  );

  const clearComments = useCallback(() => {
    setStore((prev) => clearCommentsFromStore(prev, sessionId));
  }, [sessionId, setStore]);

  return { comments, addComment, removeComment, clearComments };
};

export const formatReviewMarkdown = (
  comments: readonly ReviewComment[],
  compareFrom: string,
  compareTo: string,
): string => {
  if (comments.length === 0) {
    return `## Review: ${compareFrom} vs ${compareTo}`;
  }

  const grouped = new Map<string, ReviewComment[]>();
  for (const comment of comments) {
    const existing = grouped.get(comment.filename) ?? [];
    existing.push(comment);
    grouped.set(comment.filename, existing);
  }

  const sortedFilenames = [...grouped.keys()].sort();

  const sections = sortedFilenames.flatMap((filename) => {
    const fileComments = grouped.get(filename) ?? [];
    const sorted = [...fileComments].sort(
      (a, b) => a.lineNumber - b.lineNumber,
    );
    return sorted.map(
      (c) => `### ${c.filename} (L${c.lineNumber})\n${c.content}`,
    );
  });

  return `## Review: ${compareFrom} vs ${compareTo}\n\n${sections.join("\n\n")}`;
};
