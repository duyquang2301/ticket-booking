import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ConcertsService } from './concert.service';

@Controller('concerts')
export class ConcertsController {
    constructor(private readonly concertsService: ConcertsService) { }

    @Get()
    async findAll() {
        return this.concertsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.concertsService.findOne(id);
    }
}
