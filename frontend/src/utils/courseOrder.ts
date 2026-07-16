import type { Chapter, KnowledgeNode } from "@/types/course";

interface IndexedItem<T> {
  item: T;
  sourceIndex: number;
}

export function sortChaptersByCourseOrder(chapters: readonly Chapter[]): Chapter[] {
  return chapters
    .map((item, sourceIndex): IndexedItem<Chapter> => ({ item, sourceIndex }))
    .sort(
      (left, right) =>
        left.item.orderIndex - right.item.orderIndex ||
        left.sourceIndex - right.sourceIndex ||
        left.item.id.localeCompare(right.item.id)
    )
    .map(({ item }) => item);
}

export function sortNodesByCourseOrder(
  chapters: readonly Chapter[],
  nodes: readonly KnowledgeNode[]
): KnowledgeNode[] {
  const chapterPosition = new Map(
    sortChaptersByCourseOrder(chapters).map((chapter, index) => [chapter.id, index] as const)
  );

  return nodes
    .map((item, sourceIndex): IndexedItem<KnowledgeNode> => ({ item, sourceIndex }))
    .sort((left, right) => {
      const leftChapterPosition = left.item.chapterId
        ? chapterPosition.get(left.item.chapterId)
        : undefined;
      const rightChapterPosition = right.item.chapterId
        ? chapterPosition.get(right.item.chapterId)
        : undefined;
      const leftHasKnownChapter = leftChapterPosition !== undefined;
      const rightHasKnownChapter = rightChapterPosition !== undefined;

      if (leftHasKnownChapter !== rightHasKnownChapter) {
        return leftHasKnownChapter ? -1 : 1;
      }
      if (
        leftChapterPosition !== undefined &&
        rightChapterPosition !== undefined &&
        leftChapterPosition !== rightChapterPosition
      ) {
        return leftChapterPosition - rightChapterPosition;
      }
      if (left.item.chapterId === right.item.chapterId) {
        return (
          left.item.orderIndex - right.item.orderIndex ||
          left.sourceIndex - right.sourceIndex ||
          left.item.id.localeCompare(right.item.id)
        );
      }
      return left.sourceIndex - right.sourceIndex || left.item.id.localeCompare(right.item.id);
    })
    .map(({ item }) => item);
}
