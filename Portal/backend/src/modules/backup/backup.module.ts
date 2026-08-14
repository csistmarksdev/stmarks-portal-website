import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";

/**
 * No `MongooseModule.forFeature` here, unlike every other module.
 *
 * A backup is not about one schema — it is about the whole database, including
 * collections a future module has not been written yet. The service works
 * through the raw `Connection` and `db.listCollections()`, so a collection
 * added tomorrow is carried without anyone remembering to add it to a list.
 */
@Module({
  imports: [AuditModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
