import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  CHAT_MESSAGE_MAX,
  CHAT_RETENTION_DAYS,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
  type ChatUnreadSummary,
} from "@portal/shared";
import { isValidObjectId, Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { RolesService } from "../roles/roles.service";
import { User } from "../users/schemas/user.schema";
import { MessagesQueryDto } from "./dto/chat.dto";
import { Conversation, ConversationDocument } from "./schemas/conversation.schema";
import { Message, MessageDocument } from "./schemas/message.schema";

/** Messages older than this are deleted - and treated as gone already. */
function retentionCutoff(): Date {
  return new Date(Date.now() - CHAT_RETENTION_DAYS * 86_400_000);
}

/**
 * Direct messages between Portal accounts.
 *
 * Private by design: a conversation is readable only by its two participants.
 * No permission opens someone else's - not even a super admin's - and message
 * text is never written to the audit log.
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversations: Model<Conversation>,
    @InjectModel(Message.name) private readonly messages: Model<Message>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly roles: RolesService,
  ) {}

  /* ------------------------------------------------------------------------ */
  /* People                                                                   */
  /* ------------------------------------------------------------------------ */

  private async contactsById(ids: string[]): Promise<Map<string, ChatContact>> {
    const valid = ids.filter((id) => isValidObjectId(id));
    const docs = await this.users.find({ _id: { $in: valid } }).lean().exec();
    const entries = await Promise.all(
      docs.map(async (doc) => {
        const id = String(doc._id);
        return [id, { id, name: doc.name, roleName: await this.roles.nameOf(doc.role) }] as const;
      }),
    );
    return new Map(entries);
  }

  /** Every other active account - anyone signed in can message anyone. */
  async contacts(me: AuthenticatedUser): Promise<ChatContact[]> {
    const docs = await this.users
      .find({ active: true, _id: { $ne: me.userId } })
      .sort({ name: 1 })
      .lean()
      .exec();
    return Promise.all(
      docs.map(async (doc) => ({
        id: String(doc._id),
        name: doc.name,
        roleName: await this.roles.nameOf(doc.role),
      })),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Conversations                                                            */
  /* ------------------------------------------------------------------------ */

  private otherOf(doc: { participants: string[] }, me: string): string {
    return doc.participants.find((id) => id !== me) ?? me;
  }

  /** Loads a conversation, refusing anyone who is not in it. */
  private async mine(id: string, me: AuthenticatedUser): Promise<ConversationDocument> {
    const doc = isValidObjectId(id) ? await this.conversations.findById(id).exec() : null;
    // The same answer whether it does not exist or is someone else's, so ids
    // cannot be probed.
    if (!doc || !doc.participants.includes(me.userId)) {
      throw new NotFoundException("Conversation not found");
    }
    return doc;
  }

  private async unreadIn(doc: ConversationDocument | Conversation & { _id: unknown }, me: string) {
    const readAt = doc.reads instanceof Map ? doc.reads.get(me) : (doc.reads as Record<string, Date>)?.[me];
    const cutoff = retentionCutoff();
    const since = readAt && readAt > cutoff ? readAt : cutoff;
    return this.messages
      .countDocuments({
        conversationId: String(doc._id),
        senderId: { $ne: me },
        createdAt: { $gt: since },
      })
      .exec();
  }

  private present(
    doc: ConversationDocument,
    me: string,
    contacts: Map<string, ChatContact>,
    unread: number,
  ): ChatConversation {
    const other = this.otherOf(doc, me);
    const theirs = doc.reads?.get(other);
    return {
      id: String(doc._id),
      with: contacts.get(other) ?? null,
      ...(doc.lastMessage?.createdAt && doc.lastMessage.createdAt > retentionCutoff()
        ? {
            lastMessage: {
              body: doc.lastMessage.body,
              senderId: doc.lastMessage.senderId,
              createdAt: doc.lastMessage.createdAt.toISOString(),
            },
          }
        : {}),
      unread,
      ...(theirs ? { theirLastReadAt: theirs.toISOString() } : {}),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /** My conversations, most recent first. Empty ones (never written in) are left out. */
  async list(me: AuthenticatedUser): Promise<ChatConversation[]> {
    const docs = await this.conversations
      .find({ participants: me.userId, "lastMessage.createdAt": { $gt: retentionCutoff() } })
      .sort({ updatedAt: -1 })
      .limit(200)
      .exec();
    const contacts = await this.contactsById(docs.map((doc) => this.otherOf(doc, me.userId)));
    const unread = await Promise.all(docs.map((doc) => this.unreadIn(doc, me.userId)));
    return docs.map((doc, index) => this.present(doc, me.userId, contacts, unread[index]));
  }

  async get(id: string, me: AuthenticatedUser): Promise<ChatConversation> {
    const doc = await this.mine(id, me);
    const contacts = await this.contactsById([this.otherOf(doc, me.userId)]);
    return this.present(doc, me.userId, contacts, await this.unreadIn(doc, me.userId));
  }

  /** The conversation with `userId`, created on first use. */
  async open(userId: string, me: AuthenticatedUser): Promise<ChatConversation> {
    if (userId === me.userId) throw new BadRequestException("You cannot message yourself");
    const other = isValidObjectId(userId) ? await this.users.findById(userId).lean().exec() : null;
    if (!other || !other.active) throw new NotFoundException("That account is not available");

    const participants = [me.userId, userId].sort();
    const key = participants.join(":");
    const doc = await this.conversations
      .findOneAndUpdate(
        { key },
        { $setOnInsert: { key, participants } },
        { upsert: true, new: true },
      )
      .exec();
    return this.get(String(doc._id), me);
  }

  /* ------------------------------------------------------------------------ */
  /* Messages                                                                 */
  /* ------------------------------------------------------------------------ */

  private presentMessage(doc: MessageDocument | (Message & { _id: unknown })): ChatMessage {
    return {
      id: String(doc._id),
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      body: doc.body,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  /**
   * Oldest first. `after` returns only what is new since the client's last
   * message (polling); `before` pages back through history.
   */
  async messagesIn(
    id: string,
    query: MessagesQueryDto,
    me: AuthenticatedUser,
  ): Promise<ChatMessage[]> {
    await this.mine(id, me);
    const limit = query.limit ?? 50;
    const cutoff = retentionCutoff();
    const after = query.after ? new Date(query.after) : null;
    const createdAt: Record<string, Date> = { $gt: after && after > cutoff ? after : cutoff };
    if (query.before) createdAt.$lt = new Date(query.before);

    const docs = await this.messages
      .find({ conversationId: id, createdAt })
      // Newest `limit` when paging back; oldest `limit` after a point.
      .sort({ createdAt: query.after ? 1 : -1 })
      .limit(limit)
      .lean()
      .exec();
    const ordered = query.after ? docs : docs.reverse();
    return ordered.map((doc) => this.presentMessage(doc));
  }

  async send(id: string, body: string, me: AuthenticatedUser): Promise<ChatMessage> {
    const text = body.replace(/\s+$/, "").replace(/^\s*\n/, "");
    if (!text.trim()) throw new BadRequestException("A message cannot be empty");
    if (text.length > CHAT_MESSAGE_MAX) {
      throw new BadRequestException(`Keep a message under ${CHAT_MESSAGE_MAX} characters`);
    }

    const conversation = await this.mine(id, me);
    const otherId = this.otherOf(conversation, me.userId);
    const other = isValidObjectId(otherId) ? await this.users.findById(otherId).lean().exec() : null;
    if (!other || !other.active) {
      throw new ForbiddenException("This account is no longer active, so it cannot receive messages");
    }

    const message = await this.messages.create({
      conversationId: id,
      senderId: me.userId,
      body: text,
    });
    // Writing in a conversation reads it, too.
    await this.conversations
      .updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessage: { body: text, senderId: me.userId, createdAt: message.createdAt },
            [`reads.${me.userId}`]: message.createdAt,
          },
        },
      )
      .exec();
    return this.presentMessage(message);
  }

  async markRead(id: string, me: AuthenticatedUser): Promise<void> {
    await this.mine(id, me);
    // `timestamps: false` - reading must not move the conversation to the top.
    await this.conversations
      .updateOne({ _id: id }, { $set: { [`reads.${me.userId}`]: new Date() } }, { timestamps: false })
      .exec();
  }

  async unread(me: AuthenticatedUser): Promise<ChatUnreadSummary> {
    const docs = await this.conversations
      .find({ participants: me.userId, "lastMessage.createdAt": { $gt: retentionCutoff() } })
      .exec();
    const counts = await Promise.all(docs.map((doc) => this.unreadIn(doc, me.userId)));
    return { total: counts.reduce((sum, count) => sum + count, 0) };
  }
}
