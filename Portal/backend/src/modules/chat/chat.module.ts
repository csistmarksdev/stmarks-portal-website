import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { RolesModule } from "../roles/roles.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { Conversation, ConversationSchema } from "./schemas/conversation.schema";
import { Message, MessageSchema } from "./schemas/message.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RolesModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
