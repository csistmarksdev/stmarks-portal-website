import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { ChatService } from "./chat.service";
import { MessagesQueryDto, OpenConversationDto, SendMessageDto } from "./dto/chat.dto";

/*
 * Open to every signed-in account — no permission is needed to talk to a
 * colleague. Each call is scoped to the caller: they see and write only their
 * own conversations.
 */
@ApiTags("Admin — Messages")
@ApiBearerAuth()
@Controller("admin/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("contacts")
  @ApiOperation({ summary: "Accounts you can message" })
  contacts(@CurrentUser() me: AuthenticatedUser) {
    return this.chat.contacts(me);
  }

  @Get("unread")
  @ApiOperation({ summary: "How many messages are waiting for you" })
  unread(@CurrentUser() me: AuthenticatedUser) {
    return this.chat.unread(me);
  }

  @Get("conversations")
  @ApiOperation({ summary: "Your conversations, most recent first" })
  list(@CurrentUser() me: AuthenticatedUser) {
    return this.chat.list(me);
  }

  @Post("conversations")
  @HttpCode(200)
  @ApiOperation({ summary: "Open (or start) the conversation with an account" })
  open(@Body() dto: OpenConversationDto, @CurrentUser() me: AuthenticatedUser) {
    return this.chat.open(dto.userId, me);
  }

  @Get("conversations/:id")
  get(@Param("id") id: string, @CurrentUser() me: AuthenticatedUser) {
    return this.chat.get(id, me);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "Messages, oldest first; `after` for new ones, `before` for history" })
  messages(
    @Param("id") id: string,
    @Query() query: MessagesQueryDto,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    return this.chat.messagesIn(id, query, me);
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message" })
  send(
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    return this.chat.send(id, dto.body, me);
  }

  @Post("conversations/:id/read")
  @HttpCode(204)
  @ApiOperation({ summary: "Mark the conversation read" })
  async read(@Param("id") id: string, @CurrentUser() me: AuthenticatedUser) {
    await this.chat.markRead(id, me);
  }
}
