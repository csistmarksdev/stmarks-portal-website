import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import type { AuthTokens, LoginResponse } from "@portal/shared";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";

/**
 * bcrypt truncates input at 72 bytes and JWTs from the same user share a
 * longer identical prefix, so tokens must be digested before hashing.
 */
function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A real bcrypt hash of a string nobody knows, used to spend the same time on
 * an unknown address as on a known one. Its plaintext is irrelevant — only the
 * cost matters, and the cost factor here matches `SALT_ROUNDS` in the users
 * service so the two paths take the same length of time.
 */
const DECOY_HASH = "$2b$12$Ku7QoQ9CxLcOaGCzHhFP4.zL1aVXlLqLZ6WHV2ZzY6cq9m0nJqk6y";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { AuditService } from "../audit/audit.service";
import type { UserDocument } from "../users/schemas/user.schema";
import { UsersRepository } from "../users/users.repository";
import { UsersService } from "../users/users.service";
import type { JwtPayload } from "./strategies/jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, ip?: string): Promise<LoginResponse> {
    const user = await this.usersRepo.findByEmailWithSecrets(email);

    /*
     * An unknown address is compared against a decoy hash rather than returned
     * on straight away.
     *
     * The message was already identical either way, but the *timing* was not:
     * a real address spent ~100ms in bcrypt and an invented one came back
     * immediately, which is a reliable oracle for finding out who holds an
     * account here. That is worth closing on its own, and more so because those
     * addresses are parishioners' and clergy's real ones.
     */
    const hash = user?.passwordHash ?? DECOY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !user.active || !valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens(user);
    user.lastLoginAt = new Date();
    await user.save();

    await this.audit.log(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      "login",
      "auth",
      user.id,
      `${user.name} signed in`,
      ip,
    );

    return { ...tokens, user: this.usersService.toAdminUser(user) };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersRepo.findByIdWithSecrets(payload.sub);
    if (!user || !user.active || !user.refreshTokenHash) {
      throw new UnauthorizedException("Session expired");
    }
    const matches = await bcrypt.compare(digest(refreshToken), user.refreshTokenHash);
    if (!matches) {
      // Token was rotated or revoked — treat as a stolen/stale token.
      throw new UnauthorizedException("Session expired");
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.usersService.toAdminUser(user) };
  }

  async logout(actor: AuthenticatedUser, ip?: string): Promise<void> {
    await this.usersRepo.updateById(actor.userId, {
      $unset: { refreshTokenHash: 1 },
    });
    await this.audit.log(actor, "logout", "auth", actor.userId, `${actor.name} signed out`, ip);
  }

  /** Rename yourself. Email and role stay administrator-managed. */
  async updateOwnProfile(
    actor: AuthenticatedUser,
    name: string,
    ip?: string,
  ): Promise<void> {
    await this.usersRepo.updateById(actor.userId, { $set: { name } });
    await this.audit.log(
      actor,
      "update",
      "auth",
      actor.userId,
      `${actor.name} changed their display name to "${name}"`,
      ip,
    );
  }

  /**
   * Change your own password, proving you know the current one.
   *
   * The proof matters: the caller is already authenticated, so without it a
   * borrowed session could set a new password and lock the real owner out.
   * Succeeding also drops the stored refresh hash, so every existing session —
   * including whoever may have taken one — has to sign in again.
   */
  async changeOwnPassword(
    actor: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
    ip?: string,
  ): Promise<void> {
    // `passwordHash` is `select: false` on the schema, so the plain finder
    // returns a document without it and every comparison would fail.
    const user = await this.usersRepo.findByIdWithSecrets(actor.userId);
    if (!user || !user.active) {
      throw new UnauthorizedException("Account is no longer active");
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      await this.audit.log(
        actor,
        "update",
        "auth",
        actor.userId,
        `Failed password change for ${actor.email}: current password incorrect`,
        ip,
      );
      throw new UnauthorizedException("Current password is incorrect");
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException(
        "The new password is the same as the current one",
      );
    }

    await this.usersRepo.updateById(actor.userId, {
      $set: { passwordHash: await bcrypt.hash(newPassword, 12) },
      $unset: { refreshTokenHash: 1 },
    });

    await this.audit.log(
      actor,
      "update",
      "auth",
      actor.userId,
      `${actor.name} changed their own password`,
      ip,
    );
  }

  /** Signs a fresh access+refresh pair and stores the refresh hash (rotation). */
  private async issueTokens(user: UserDocument): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessExpires = this.config.get<string>(
      "jwt.accessExpires",
      "15m",
    ) as JwtSignOptions["expiresIn"];
    const refreshExpires = this.config.get<string>(
      "jwt.refreshExpires",
      "7d",
    ) as JwtSignOptions["expiresIn"];
    // `jti` makes every issued token unique — otherwise two tokens signed in
    // the same second are byte-identical and rotation cannot invalidate the
    // previous one.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: this.config.get<string>("jwt.accessSecret"),
          expiresIn: accessExpires,
        },
      ),
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: this.config.get<string>("jwt.refreshSecret"),
          expiresIn: refreshExpires,
        },
      ),
    ]);

    user.refreshTokenHash = await bcrypt.hash(digest(refreshToken), 10);
    await user.save();

    return { accessToken, refreshToken };
  }
}
