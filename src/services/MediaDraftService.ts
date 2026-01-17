import type { MediaItem, Template } from '@/types';

export interface MediaDraft {
  templateId: string;
  aspectRatio: Template['aspectRatio'];
  mediaSlots: number;
  items: Array<MediaItem | null>;
  createdAt: number;
}

const DRAFT_STORAGE_KEY = 'xtrim_media_draft';

const serializeDraft = (draft: MediaDraft): string =>
  JSON.stringify(draft, (key, value) => {
    if (key === 'createdAt' && value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });

const deserializeDraft = (payload: string): MediaDraft | null => {
  try {
    return JSON.parse(payload, (key, value) => {
      if (key === 'createdAt' && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    }) as MediaDraft;
  } catch {
    return null;
  }
};

export class MediaDraftService {
  private static draft: MediaDraft | null = null;

  static initializeDraft(template: Template): MediaDraft {
    const draft: MediaDraft = {
      templateId: template.id,
      aspectRatio: template.aspectRatio,
      mediaSlots: template.mediaSlots,
      items: Array.from({ length: template.mediaSlots }, () => null),
      createdAt: Date.now(),
    };
    this.saveDraft(draft);
    return draft;
  }

  static getDraft(): MediaDraft | null {
    if (this.draft) return this.draft;
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return null;
    const draft = deserializeDraft(stored);
    this.draft = draft;
    return draft;
  }

  static setSlot(index: number, mediaItem: MediaItem): MediaDraft | null {
    const draft = this.getDraft();
    if (!draft) return null;
    const items = [...draft.items];
    items[index] = mediaItem;
    const updated = { ...draft, items };
    this.saveDraft(updated);
    return updated;
  }

  static clearDraft(): void {
    this.draft = null;
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  private static saveDraft(draft: MediaDraft): void {
    this.draft = draft;
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft));
  }
}
