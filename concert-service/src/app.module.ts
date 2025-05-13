import { Module } from '@nestjs/common';

import { ConcertsModule } from './concert/concert.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongodb:27017/concert_db',
    ),
    ConcertsModule,
  ],
})
export class AppModule {}
