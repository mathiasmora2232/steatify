import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FollowUser {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
}
export interface FeedItem {
  user: FollowUser;
  type: string;
  entityType: string;
  title: string;
  metadata: unknown;
  createdAt: string;
}

const USER_SELECT = { username: true, displayName: true, avatarUrl: true, isPublic: true } as const;

/** Follows + an auto-generated activity feed (no manual posts — events do it). */
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(meId: string, username: string): Promise<{ following: boolean }> {
    const target = await this.byUsername(username);
    if (target.id === meId) throw new BadRequestException('No puedes seguirte a ti mismo.');
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: meId, followingId: target.id } },
      create: { followerId: meId, followingId: target.id },
      update: {},
    });
    return { following: true };
  }

  async unfollow(meId: string, username: string): Promise<{ following: boolean }> {
    const target = await this.byUsername(username);
    await this.prisma.follow.deleteMany({ where: { followerId: meId, followingId: target.id } });
    return { following: false };
  }

  /** Is `meId` following `username`? Plus that user's follower/following counts. */
  async status(meId: string | null, username: string) {
    const target = await this.byUsername(username);
    const [following, followers, followingCount] = await Promise.all([
      meId ? this.prisma.follow.findUnique({ where: { followerId_followingId: { followerId: meId, followingId: target.id } } }) : null,
      this.prisma.follow.count({ where: { followingId: target.id } }),
      this.prisma.follow.count({ where: { followerId: target.id } }),
    ]);
    return { following: !!following, followers, followingCount };
  }

  /** People I follow. */
  async following(meId: string): Promise<FollowUser[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: meId },
      select: { following: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.following);
  }

  /** Activity feed: recent events from the people I follow (auto-generated). */
  async feed(meId: string, limit = 40): Promise<FeedItem[]> {
    const follows = await this.prisma.follow.findMany({ where: { followerId: meId }, select: { followingId: true } });
    const ids = follows.map((f) => f.followingId);
    if (ids.length === 0) return [];
    const events = await this.prisma.musicEvent.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { type: true, entityType: true, title: true, metadata: true, createdAt: true, user: { select: USER_SELECT } },
    });
    return events.map((e) => ({
      user: e.user,
      type: e.type,
      entityType: e.entityType,
      title: e.title,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  private async byUsername(username: string) {
    const u = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true, isPublic: true },
    });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return u;
  }
}
