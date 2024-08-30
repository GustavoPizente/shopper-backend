import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MeasuresService } from './measures.service';
import { MeasuresController } from './measures.controller';
import * as dotenv from 'dotenv';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Measure } from './measure.entity';
dotenv.config();


@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Measure]),],
  providers: [MeasuresService],
  controllers: [MeasuresController],
})
export class MeasuresModule {}
