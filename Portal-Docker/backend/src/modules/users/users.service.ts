import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import type { AdminUser, Paginated } from "@portal/shared";
import * as bcrypt from "bcryptjs";
import type { FilterQuery } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { serializeDoc } from "../../common/utils/serialize";
import { containsInsensitive } from "../../common/utils/mongo";
import { AuditService } from "../audit/audit.service";
import { User, UserDocument } from "./schemas/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersRepository } from "./users.repository";

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  toAdminUser(doc: UserDocument): AdminUser {
    return serializeDoc<AdminUser>(doc, ["passwordHash", "refreshTokenHash"]);
  }

  async list(
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<Paginated<AdminUser>> {
    const filter: FilterQuery<User> = search
      ? {
          $or: [
            { name: containsInsensitive(search) },
            { email: containsInsensitive(search) },
          ],
        }
      : {};
    const [docs, total] = await Promise.all([
      this.repo.find(filter, { createdAt: -1 }, (page - 1) * pageSize, pageSize),
      this.repo.count(filter),
    ]);
    return {
      items: docs.map((doc) => this.toAdminUser(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async getById(id: string): Promise<AdminUser> {
    return this.toAdminUser(await this.repo.findByIdOrThrow(id));
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<AdminUser> {
    if (await this.repo.exists({ email: dto.email.toLowerCase() })) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }
    const doc = await this.repo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      role: dto.role,
      active: dto.active ?? true,
    });
    await this.audit.log(actor, "create", "users", doc.id, `Created user "${dto.email}" (${dto.role})`);
    return this.toAdminUser(doc);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<AdminUser> {
    if (id === actor.userId && dto.role && dto.role !== actor.role) {
      throw new BadRequestException("You cannot change your own role");
    }
    if (id === actor.userId && dto.active === false) {
      throw new BadRequestException("You cannot deactivate your own account");
    }
    if (dto.email) {
      const existing = await this.repo.findOne({ email: dto.email.toLowerCase() });
      if (existing && existing.id !== id) {
        throw new ConflictException(`A user with email ${dto.email} already exists`);
      }
    }
    /*
     * Nulls are dropped rather than passed through.
     *
     * `updateById` reads `field: null` as "remove this field", which is what
     * content records want — an optional cover image has to be removable. No
     * field on a *user* is optional in that sense, and `PartialType` makes every
     * one of them nullable as far as validation is concerned. So `{ role: null }`
     * would have unset the role, and an account with no role has no permissions
     * and cannot be signed into: an administrator could lock someone out, or
     * themselves, with a request that looks like an ordinary edit.
     */
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== null),
    );

    const doc = await this.repo.updateById(id, {
      ...changes,
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
    });
    await this.audit.log(actor, "update", "users", id, `Updated user "${doc.email}"`);
    return this.toAdminUser(doc);
  }

  async changePassword(
    id: string,
    password: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.repo.updateById(id, {
      $set: { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
      // Force re-login everywhere.
      $unset: { refreshTokenHash: 1 },
    });
    await this.audit.log(actor, "update", "users", id, "Reset user password");
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    if (id === actor.userId) {
      throw new BadRequestException("You cannot delete your own account");
    }
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", "users", id, `Deleted user "${doc.email}"`);
  }
}
