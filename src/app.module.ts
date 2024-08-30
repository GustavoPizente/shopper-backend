import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeasuresModule } from './measures/measures.module';
import * as dotenv from 'dotenv';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Measure } from './measures/measure.entity';
dotenv.config();


@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '279413',
    database: 'shopper',
    entities: [Measure],
    synchronize: false, // Atenção: Não use em produção - pode causar perda de dados
  }),
  MeasuresModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
