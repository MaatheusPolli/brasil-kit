# Roda os testes de integração contra as APIs reais em um container isolado.
#   docker build -t brasil-sdk .
#   docker run --rm brasil-sdk                 # testes com APIs reais
#   docker run --rm brasil-sdk npm test        # suíte offline
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "test:live"]
