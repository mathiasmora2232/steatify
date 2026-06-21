import { Controller, Get, Param } from '@nestjs/common';
import { CompareService } from './compare.service';

/** Public "Compare Spaces" — how alike are two profiles' universes. */
@Controller('compare')
export class CompareController {
  constructor(private readonly compare: CompareService) {}

  @Get(':a/:b')
  vs(@Param('a') a: string, @Param('b') b: string) {
    return this.compare.compare(a, b);
  }
}
