FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4000
# Desarrollo local: recarga automática con nodemon
CMD ["npm", "run", "dev"]
