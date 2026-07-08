/**
 * Event infoboard domain (the Sportity-style module, plan Deel 1 + Deel 3 §N).
 * Standalone from the competition module: a channel can run for any event, with
 * or without scoring. Entities are plain data; behaviour lives in the pure
 * operations alongside (documents, polls, feedback).
 */

export type DocumentState = 'draft' | 'published' | 'archived';

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  /** Public channels need no code; private ones require the access code. */
  isPublic: boolean;
  accessCode?: string;
}

export interface Folder {
  id: string;
  channelId: string;
  name: string;
  /** Parent folder for nesting; absent at the channel root. */
  parentId?: string;
  sortOrder: number;
}

export interface DocumentItem {
  id: string;
  channelId: string;
  folderId?: string;
  title: string;
  /** R2 object key / URL for the file. */
  fileKey: string;
  state: DocumentState;
  version: number;
  updatedAt: string;
}

export interface PushMessage {
  id: string;
  channelId: string;
  title: string;
  body: string;
  sentAt: string;
}

export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  channelId: string;
  question: string;
  options: PollOption[];
  /** When true, a device may change its vote; otherwise first vote stands. */
  allowRevote: boolean;
  closed: boolean;
}

export interface Vote {
  pollId: string;
  optionId: string;
  deviceId: string;
}

export interface Feedback {
  channelId: string;
  /** 1–5 star rating. */
  rating: number;
  comment?: string;
}
