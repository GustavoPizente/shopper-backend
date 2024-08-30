import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as sharp from 'sharp';
import { Buffer } from 'buffer';
import { firstValueFrom } from 'rxjs';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Measure } from './measure.entity'; // Importa a entidade Measure

@Injectable()
export class MeasuresService {
  private readonly fileManager: GoogleAIFileManager;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Measure)
    private readonly measureRepository: Repository<Measure>,
  ) {
    // Inicializa o GoogleAIFileManager com a chave da API
    this.fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
  }

  async processImage(
    imageBase64: string,
    customerCode: string,
    measureDatetime: string,
    measureType: string,
  ): Promise<any> {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();

    const tempFileName = `${uuidv4()}.png`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      fs.writeFileSync(tempFilePath, pngBuffer);

      const uploadResponse = await this.fileManager.uploadFile(tempFilePath, {
        mimeType: 'image/png',
        displayName: 'Uploaded Image',
      });

      fs.unlinkSync(tempFilePath);

      if (uploadResponse && uploadResponse.file && uploadResponse.file.uri) {
        const response$ = this.httpService.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: 'escreva os números presentes nessa imagem',
                    imageUri: uploadResponse.file.uri,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        );

        const response = await firstValueFrom(response$);
        return response.data;
      } else {
        throw new Error('Erro ao fazer upload do arquivo.');
      }
    } catch (error) {
      console.error('Erro ao processar a imagem:', error);
      throw error;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  async getMeasures(customerCode: string, measureType?: string) {
    let queryBuilder = this.measureRepository.createQueryBuilder('measure')
      .where('measure.customerCode = :customerCode', { customerCode });

    if (measureType) {
      queryBuilder = queryBuilder.andWhere('measure.measureType = :measureType', { measureType });
    }

    const measures = await queryBuilder.getMany();

    if (!measures.length) {
      throw new NotFoundException({
        error_code: 'MEASURES_NOT_FOUND',
        error_description: 'Nenhuma leitura encontrada',
      });
    }

    return measures;
  }
}
