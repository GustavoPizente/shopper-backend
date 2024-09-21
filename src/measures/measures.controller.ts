import { Controller, Post,Patch,BadRequestException, Body, Get, Param, Query } from '@nestjs/common';
import { MeasuresService } from './measures.service';

@Controller('measures')
export class MeasuresController {
  constructor(private readonly measuresService: MeasuresService) {} //permite que o controlador use métodos do service

  @Post('upload')
  async uploadMeasure(                     //o método uploadMesure recebe o corpo da request e faz a tipagem
    @Body('image') image: string,
    @Body('customer_code') customerCode: string, 
    @Body('measure_datetime') measureDatetime: string,
    @Body('measure_type') measureType: string,
  ) {

    //envia os dados recebidos para o método ProcessImage  de measuresService e retorna em results
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





