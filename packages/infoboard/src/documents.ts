import type { Channel, DocumentItem, DocumentState } from './entities';

/** Allowed document lifecycle transitions. */
const TRANSITIONS: Record<DocumentState, DocumentState[]> = {
  draft: ['published'],
  published: ['archived', 'draft'],
  archived: ['published'],
};

export function canTransition(from: DocumentState, to: DocumentState): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Apply a publish-state transition, bumping the version. Throws on an illegal
 * transition so callers cannot silently corrupt the lifecycle.
 */
export function transitionDocument(doc: DocumentItem, to: DocumentState, now: string): DocumentItem {
  if (!canTransition(doc.state, to)) {
    throw new Error(`illegal document transition ${doc.state} -> ${to}`);
  }
  return { ...doc, state: to, version: doc.version + 1, updatedAt: now };
}

/** Whether a viewer with the given access code may read the channel's content. */
export function canAccessChannel(channel: Channel, providedCode?: string): boolean {
  if (channel.isPublic) return true;
  return !!channel.accessCode && channel.accessCode === providedCode;
}

/** Documents visible to spectators: published only, newest first. */
export function visibleDocuments(docs: readonly DocumentItem[]): DocumentItem[] {
  return docs
    .filter((d) => d.state === 'published')
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}
