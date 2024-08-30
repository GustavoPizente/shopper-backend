// src/measure/measure.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('measure')
export class Measure {
  @PrimaryGeneratedColumn('uuid')
  measureUuid: string;

  @Column()
  customerCode: string;

  @Column()
  measureDatetime: Date;

  @Column()
  measureType: string;

  @Column()
  hasConfirmed: boolean;

  @Column()
  imageUrl: string;
}
