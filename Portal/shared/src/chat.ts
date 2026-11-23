/* -------------------------------------------------------------------------- */
/* Direct messages between Portal accounts                                    */
/* -------------------------------------------------------------------------- */

/**
 * Messages are deleted automatically this many days after they are sent, and
 * a conversation goes once its last message has (church request, 23 Nov 2026).
 */
export const CHAT_RETENTION_DAYS = 30;

/** Longest message accepted, in characters. */
export const CHAT_MESSAGE_MAX = 4000;

/** Someone you can message: just enough to recognise them. */
export interface ChatContact {
  id: string;
  name: string;
  roleName: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** A one-to-one conversation, as the signed-in user sees it. */
export interface ChatConversation {
  id: string;
  /** The other person. `null` when their account has since been deleted. */
  with: ChatContact | null;
  lastMessage?: {
    body: string;
    senderId: string;
    createdAt: string;
  };
  /** Messages from the other person not yet read by me. */
  unread: number;
  /** When the other person last read the conversation — for "Seen". */
  theirLastReadAt?: string;
  updatedAt: string;
}

export interface ChatUnreadSummary {
  total: number;
}
