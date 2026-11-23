import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  ALL_PERMISSIONS,
  BUILT_IN_ROLE_DESCRIPTIONS,
  BUILT_IN_ROLE_NAMES,
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  USER_ROLES,
  isBuiltInRole,
  type Permission,
  type RoleDefinition,
} from "@portal/shared";
import { randomBytes } from "node:crypto";
import { Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { User } from "../users/schemas/user.schema";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { Role } from "./schemas/role.schema";

interface CachedRole {
  name: string;
  description?: string;
  permissions: Permission[];
}

/**
 * Custom roles are read on every authenticated request (the JWT strategy
 * resolves a user's permissions each time, so a change applies at once). A
 * short-lived cache keeps that to one query every few seconds; writes made
 * here clear it immediately.
 */
const CACHE_MS = 10_000;

/** Permissions in catalogue order, de-duplicated — keeps stored lists tidy. */
function normalise(permissions: readonly Permission[]): Permission[] {
  const wanted = new Set(permissions);
  return ALL_PERMISSIONS.filter((permission) => wanted.has(permission));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

@Injectable()
export class RolesService {
  private cache: Map<string, CachedRole> | null = null;
  private cachedAt = 0;

  constructor(
    @InjectModel(Role.name) private readonly roles: Model<Role>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------------------------------------------------ */
  /* Resolution                                                               */
  /* ------------------------------------------------------------------------ */

  private async customRoles(): Promise<Map<string, CachedRole>> {
    if (this.cache && Date.now() - this.cachedAt < CACHE_MS) return this.cache;
    const docs = await this.roles.find().lean().exec();
    this.cache = new Map(
      docs.map((doc) => [
        doc.key,
        { name: doc.name, description: doc.description, permissions: normalise(doc.permissions) },
      ]),
    );
    this.cachedAt = Date.now();
    return this.cache;
  }

  private invalidate() {
    this.cache = null;
  }

  async exists(key: string): Promise<boolean> {
    return isBuiltInRole(key) || (await this.customRoles()).has(key);
  }

  /** What `key` allows. An unknown role allows nothing. */
  async permissionsFor(key: string): Promise<Permission[]> {
    if (isBuiltInRole(key)) return [...ROLE_PERMISSIONS[key]];
    return [...((await this.customRoles()).get(key)?.permissions ?? [])];
  }

  async nameOf(key: string): Promise<string> {
    if (isBuiltInRole(key)) return BUILT_IN_ROLE_NAMES[key];
    return (await this.customRoles()).get(key)?.name ?? key;
  }

  /* ------------------------------------------------------------------------ */
  /* Escalation rule                                                          */
  /* ------------------------------------------------------------------------ */

  /**
   * Nobody can create, change or hand out a role that can do something they
   * cannot. Without this, anyone allowed to manage roles or users could make
   * themselves a super admin in two clicks.
   */
  assertWithin(actor: AuthenticatedUser, permissions: readonly Permission[], what: string) {
    const held = new Set(actor.permissions);
    const beyond = permissions.filter((permission) => !held.has(permission));
    if (beyond.length === 0) return;
    const labels = beyond.map(
      (permission) =>
        PERMISSION_CATALOG.find((entry) => entry.permission === permission)?.label ?? permission,
    );
    throw new ForbiddenException(
      `${what} includes access you do not have yourself: ${labels.join(", ")}.`,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CRUD                                                                     */
  /* ------------------------------------------------------------------------ */

  async list(): Promise<RoleDefinition[]> {
    const [custom, counts] = await Promise.all([
      this.roles.find().sort({ createdAt: 1 }).lean().exec(),
      this.users.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
    ]);
    const countOf = new Map(counts.map((entry) => [entry._id, entry.count]));

    return [
      ...USER_ROLES.map((key) => ({
        key,
        name: BUILT_IN_ROLE_NAMES[key],
        description: BUILT_IN_ROLE_DESCRIPTIONS[key],
        permissions: [...ROLE_PERMISSIONS[key]],
        builtIn: true,
        userCount: countOf.get(key) ?? 0,
      })),
      ...custom.map((doc) => ({
        key: doc.key,
        name: doc.name,
        ...(doc.description ? { description: doc.description } : {}),
        permissions: normalise(doc.permissions),
        builtIn: false,
        userCount: countOf.get(doc.key) ?? 0,
      })),
    ];
  }

  private async findCustom(key: string) {
    if (isBuiltInRole(key)) {
      throw new BadRequestException("Built-in roles cannot be changed. Create a custom role instead.");
    }
    const doc = await this.roles.findOne({ key }).exec();
    if (!doc) throw new NotFoundException(`No role "${key}"`);
    return doc;
  }

  private async assertNameFree(name: string, exceptKey?: string) {
    const lower = name.trim().toLowerCase();
    const clash =
      Object.values(BUILT_IN_ROLE_NAMES).some((builtIn) => builtIn.toLowerCase() === lower) ||
      (await this.roles
        .exists({
          name: { $regex: `^${lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
          ...(exceptKey ? { key: { $ne: exceptKey } } : {}),
        })
        .exec());
    if (clash) throw new ConflictException(`A role called "${name.trim()}" already exists`);
  }

  async create(dto: CreateRoleDto, actor: AuthenticatedUser): Promise<RoleDefinition> {
    const permissions = normalise(dto.permissions);
    this.assertWithin(actor, permissions, "This role");
    await this.assertNameFree(dto.name);

    // A readable key where the name allows one (Tamil names slug to nothing),
    // never colliding with a built-in or an existing role.
    let key = slugify(dto.name);
    if (!key || isBuiltInRole(key) || (await this.roles.exists({ key }).exec())) {
      key = `${key || "role"}-${randomBytes(3).toString("hex")}`;
    }

    const doc = await this.roles.create({
      key,
      name: dto.name.trim(),
      ...(dto.description?.trim() ? { description: dto.description.trim() } : {}),
      permissions,
    });
    this.invalidate();
    await this.audit.log(actor, "create", "roles", key, `Created role "${doc.name}"`);
    return {
      key,
      name: doc.name,
      ...(doc.description ? { description: doc.description } : {}),
      permissions,
      builtIn: false,
      userCount: 0,
    };
  }

  async update(key: string, dto: UpdateRoleDto, actor: AuthenticatedUser): Promise<RoleDefinition> {
    const doc = await this.findCustom(key);
    // Editing a role is managing everyone who holds it; the same ceiling applies
    // to what it allows now as to what it will allow.
    this.assertWithin(actor, doc.permissions, "This role");
    if (dto.permissions) this.assertWithin(actor, dto.permissions, "This role");
    if (dto.name && dto.name.trim().toLowerCase() !== doc.name.toLowerCase()) {
      await this.assertNameFree(dto.name, key);
    }

    if (dto.name) doc.name = dto.name.trim();
    if (dto.description !== undefined) doc.description = dto.description?.trim() || undefined;
    if (dto.permissions) doc.permissions = normalise(dto.permissions);
    await doc.save();
    this.invalidate();

    await this.audit.log(actor, "update", "roles", key, `Updated role "${doc.name}"`);
    return {
      key,
      name: doc.name,
      ...(doc.description ? { description: doc.description } : {}),
      permissions: normalise(doc.permissions),
      builtIn: false,
      userCount: await this.users.countDocuments({ role: key }).exec(),
    };
  }

  async remove(key: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.findCustom(key);
    this.assertWithin(actor, doc.permissions, "This role");
    const holders = await this.users.countDocuments({ role: key }).exec();
    if (holders > 0) {
      throw new ConflictException(
        `${holders} user${holders === 1 ? " still holds" : "s still hold"} this role. Move ${
          holders === 1 ? "them" : "them all"
        } to another role first.`,
      );
    }
    await doc.deleteOne();
    this.invalidate();
    await this.audit.log(actor, "delete", "roles", key, `Deleted role "${doc.name}"`);
  }
}
