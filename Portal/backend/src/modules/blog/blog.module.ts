import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { BlogAdminController } from "./blog.admin.controller";
import { BlogPublicController } from "./blog.public.controller";
import { BlogService } from "./blog.service";
import { BlogPostEntity, BlogPostSchema } from "./schemas/blog-post.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPostEntity.name, schema: BlogPostSchema },
    ]),
    AuditModule,
  ],
  controllers: [BlogPublicController, BlogAdminController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
