import { Controller, Get, Param, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ConcertsService } from './concert.service';
import { Concert } from './model/concerts.schema';

@Controller('concerts')
export class ConcertsController {
  private readonly logger = new Logger(ConcertsController.name);

  constructor(private readonly concertsService: ConcertsService) {}

  @Get()
  async findAll(): Promise<Concert[]> {
    this.logger.log('Fetching all concerts');
    return this.concertsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Concert> {
    this.logger.log(`Fetching concert with ID: ${id}`);
    return this.concertsService.findOne(id);
  }
}
