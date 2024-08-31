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
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Measure)
    private readonly measureRepository: Repository<Measure>,
  ) {}

  async processImage(
    imageBase64: string,
    customerCode: string,
    measureDatetime: string,
    measureType: string,
  ): Promise<any> {
    // console.log para verificar a chave da API
    console.log('API Key:', process.env.GEMINI_API_KEY);

    // carrega a imagem em base 64 e converte para png
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();

    //cria um arquivo temporário

    const tempFileName = `${uuidv4()}.png`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    // Instancia GoogleAIFileManager localmente
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

    //guarda o arquivo em local temporário
    try {
      fs.writeFileSync(tempFilePath, pngBuffer);

      //faz o upload desse arquivo temporário para serviço externo
      const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'image/png',
        displayName: 'Uploaded Image',
      });

      fs.unlinkSync(tempFilePath); //remove o arquivo temporário

      //verificação de carregamento
      if (uploadResponse && uploadResponse.file && uploadResponse.file.uri) {
        //solicitação POST por httpService
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
              'Content-Type': 'application/json',
            },
          },
        );

        const response = await firstValueFrom(response$); //converte observável em promisse
        return response.data; //reposta da GEMINI

        //tratamento de erros
      } else {
        throw new Error('Erro ao fazer upload do arquivo.');
      }
    } catch (error) {
      if (error.response) {
        console.error('Erro ao processar a imagem:', error.response.data);
      } else {
        console.error('Erro ao processar a imagem:', error.message);
      }
      throw error;
    } finally {
      //limpeza final em arquivos temporários
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  

  async getMeasures(customerCode: string, measureType?: string) {
    let queryBuilder = this.measureRepository //Acessa a Entidade para interagir com o Banco de Dados
      .createQueryBuilder('measure')
      .where('measure.customerCode = :customerCode', { customerCode }); //busca pelo CostumerCode

    if (measureType) {
      queryBuilder = queryBuilder.andWhere(
        'measure.measureType = :measureType',
        { measureType },
      );
    }

    const measures = await queryBuilder.getMany(); //armazena os resultados da consulta

    if (!measures.length) {  //tratamento de erros, se está vazio
      throw new NotFoundException({
        error_code: 'MEASURES_NOT_FOUND',
        error_description: 'Nenhuma leitura encontrada',
      });
    }

    return measures;
  }
}
