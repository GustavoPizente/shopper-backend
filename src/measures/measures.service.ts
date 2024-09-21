import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as sharp from 'sharp';
import { Buffer } from 'buffer';
import { firstValueFrom } from 'rxjs';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    image: string,
    customerCode: string,
    measureDatetime: string,
    measureType: string,
  ): Promise<any> {
    // console.log para verificar a chave da API
    console.log('API Key:', process.env.GEMINI_API_KEY);

    // carrega a imagem em base 64 e converte para png
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

     // Log para verificar a string base64
     console.log('Tamanho da string base64:', base64Data.length);
     console.log('Início da string base64:', base64Data.substring(0, 50)); // Imprime os primeiros 50 caracteres
     
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();

    //cria um arquivo temporário e armazena os.tmpdir

    const tempFileName = `${uuidv4()}.png`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    //guarda o arquivo em local temporário
    fs.writeFileSync(tempFilePath, pngBuffer); 
    
    
    
    // Instancia GoogleAIFileManager localmente para fazer upload da imagem 
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

    
    try {
      

       // Faz o upload do arquivo
       const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'image/png',
        displayName: 'Uploaded Image',
      });

      const uploadedImageUri = uploadResponse.file.uri;
      fs.unlinkSync(tempFilePath); // Remove o arquivo temporário

      // Verificação de carregamento
      if (uploadedImageUri) {
        // Instancia o GoogleGenerativeAI para gerar o conteúdo
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Seleciona o modelo desejado
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro', // Modelo a ser utilizado
        });

        // Gera conteúdo usando o URI da imagem
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadResponse.file.mimeType, // Tipo MIME da imagem
              fileUri: uploadedImageUri,              // URI da imagem enviada
            },
          },
          { text: 'Escreva os números presentes nessa imagem.' },
        ]);

        // Retorna o resultado gerado
        return result.response.text;
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
      // Limpeza final de arquivos temporários
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
