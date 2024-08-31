# Use uma imagem Node.js como base
FROM node:16

# Defina o diretório de trabalho
WORKDIR /usr/src/app

# Copie o package.json e o package-lock.json para o contêiner
COPY package*.json ./

# Instale as dependências da aplicação
RUN npm install

# Copie o restante do código da aplicação
COPY . .

# Construa o projeto NestJS
RUN npm run build

# Exponha a porta que o aplicativo usará
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "run", "start:prod"]
