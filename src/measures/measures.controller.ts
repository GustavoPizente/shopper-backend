import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { MeasuresService } from './measures.service';

@Controller('measures')
export class MeasuresController {
  constructor(private readonly measuresService: MeasuresService) {}

  @Post('upload')
  async uploadMeasure(
    @Body('image') image: string,
    @Body('customer_code') customerCode: string,
    @Body('measure_datetime') measureDatetime: string,
    @Body('measure_type') measureType: string,
  ) {
    const result = await this.measuresService.processImage(image, customerCode, measureDatetime, measureType);
    return result;
  }

  @Get(':customer_code/list')
  async getMeasures(
    @Param('customer_code') customerCode: string,
    @Query('measure_type') measureType?: string,
  ) {
    const measures = await this.measuresService.getMeasures(customerCode, measureType);
    return {
      customer_code: customerCode,
      measures: measures.map(measure => ({
        measure_uuid: measure.measureUuid,
        measure_datetime: measure.measureDatetime,
        measure_type: measure.measureType,
        has_confirmed: measure.hasConfirmed,
        image_url: measure.imageUrl,
      })),
    };
  }
}
