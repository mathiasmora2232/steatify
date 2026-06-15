import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService, TopType } from './stats.service';
import { AggregationService } from './aggregation.service';
import { resolveWindow, Window } from './range';

const TOP_TYPES: TopType[] = ['tracks', 'artists', 'albums', 'genres'];

interface WindowQuery {
  range?: string;
  day?: string;
  from?: string;
  to?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly aggregation: AggregationService,
    private readonly prisma: PrismaService,
  ) {}

  /** Resumen para una ventana: preset (range), día (day=YYYY-MM-DD) o rango (from/to). */
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser, @Query() q: WindowQuery) {
    const { window } = await this.resolve(user.id, q);
    return this.stats.summary(user.id, window);
  }

  /** "Estado de actividad": qué dicen tus últimas 24h (música + gaming), con razón. */
  @Get('activity-state')
  activityState(@CurrentUser() user: AuthUser) {
    return this.stats.activityState(user.id);
  }

  /** "Resumen de la semana": esta semana vs la anterior + récord + comeback + obsesión. */
  @Get('weekly-recap')
  weeklyRecap(@CurrentUser() user: AuthUser) {
    return this.stats.weeklyRecap(user.id);
  }

  /** Timeline de hoy: primera canción, hora pico, última. */
  @Get('today-timeline')
  todayTimeline(@CurrentUser() user: AuthUser) {
    return this.stats.todayTimeline(user.id);
  }

  /** Detalle de un día del calendario: minutos, top canción/artista, nueva entrada. */
  @Get('day')
  dayDetail(@CurrentUser() user: AuthUser, @Query('day') day: string) {
    return this.stats.dayDetail(user.id, day);
  }

  /** Rankings dentro de la ventana. ?type=&range|day|from|to&limit= */
  @Get('top')
  async top(
    @CurrentUser() user: AuthUser,
    @Query() q: WindowQuery & { type?: string; limit?: string },
  ) {
    const type = q.type ?? 'tracks';
    if (!TOP_TYPES.includes(type as TopType)) {
      throw new BadRequestException(`type must be one of ${TOP_TYPES.join(', ')}`);
    }
    const n = Math.min(Math.max(parseInt(q.limit ?? '10', 10) || 10, 1), 100);
    const { window } = await this.resolve(user.id, q);
    return this.stats.top(user.id, type as TopType, window, n);
  }

  /** Serie de minutos por día para el chart. ?days=14 */
  @Get('series')
  series(@CurrentUser() user: AuthUser, @Query('days') days = '14') {
    const n = Math.min(Math.max(parseInt(days, 10) || 14, 1), 366);
    return this.stats.series(user.id, n);
  }

  /** Minutos por mes (lifetime) para la vista "Todo" de energía musical. */
  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser) {
    return this.stats.monthlySeries(user.id);
  }

  /** Reloj de escucha (reproducciones por hora local) dentro de la ventana. */
  @Get('clock')
  async clock(@CurrentUser() user: AuthUser, @Query() q: WindowQuery) {
    const { window, tzOffset } = await this.resolve(user.id, q);
    return this.stats.clock(user.id, window, tzOffset);
  }

  /** Reproducciones por día de la semana dentro de la ventana. */
  @Get('weekdays')
  async weekdays(@CurrentUser() user: AuthUser, @Query() q: WindowQuery) {
    const { window, tzOffset } = await this.resolve(user.id, q);
    return this.stats.weekdays(user.id, window, tzOffset);
  }

  /** Feed reciente con timestamps, opcionalmente acotado a la ventana. ?limit= */
  @Get('recent')
  async recent(@CurrentUser() user: AuthUser, @Query() q: WindowQuery & { limit?: string }) {
    const n = Math.min(Math.max(parseInt(q.limit ?? '30', 10) || 30, 1), 200);
    const { window } = await this.resolve(user.id, q);
    return this.stats.recent(user.id, window, n);
  }

  /** Comparador temporal. ?period=month|year */
  @Get('compare')
  compare(@CurrentUser() user: AuthUser, @Query('period') period = 'month') {
    if (period !== 'month' && period !== 'year') {
      throw new BadRequestException('period must be month or year');
    }
    return this.stats.compare(user.id, period);
  }

  /** Contribution graph (estilo GitHub). ?days=365 */
  @Get('contributions')
  contributions(@CurrentUser() user: AuthUser, @Query('days') days = '365') {
    const n = Math.min(Math.max(parseInt(days, 10) || 365, 30), 366);
    return this.aggregation.contributionGraph(user.id, n);
  }

  /** Build a window from the query using the user's stored local tz offset. */
  private async resolve(userId: string, q: WindowQuery): Promise<{ window: Window; tzOffset: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tzOffset: true },
    });
    const tzOffset = user?.tzOffset ?? 0;
    return { window: resolveWindow(q, tzOffset), tzOffset };
  }
}
