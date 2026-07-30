import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { BaseRepository } from "../../common/repositories/base.repository";
import { ChurchEventEntity } from "./schemas/event.schema";

@Injectable()
export class EventsRepository extends BaseRepository<ChurchEventEntity> {
  constructor(@InjectModel(ChurchEventEntity.name) model: Model<ChurchEventEntity>) {
    super(model);
  }
}
