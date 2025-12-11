# Usa una imagen oficial de Node.js como base
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto de los archivos de tu aplicación
COPY . .

# Expone el puerto en el que corre tu aplicación (5000 según tu server.js)
EXPOSE 5000

# El comando para iniciar tu aplicación
CMD [ "npm", "start" ]