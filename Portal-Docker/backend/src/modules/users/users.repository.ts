import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { BaseRepository } from "../../common/repositories/base.repository";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) model: Model<User>) {
    super(model);
  }

  /** Includes the password + refresh hashes (login/refresh flows only). */
  findByEmailWithSecrets(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase() })
      .select("+passwordHash +refreshTokenHash")
      .exec();
  }

  findByIdWithSecrets(id: string): Promise<UserDocument | null> {
    return this.model
      .findById(id)
      .select("+passwordHash +refreshTokenHash")
      .exec();
  }
}
