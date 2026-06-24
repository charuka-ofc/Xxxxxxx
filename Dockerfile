FROM node:lts-bullseye

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json .

RUN npm install && npm install -g qrcode-terminal pm2

COPY . .

EXPOSE 7860 

# ❌ පරණ පේළිය: CMD ["npm", "start"]
# ✔️ වෙනස් කරන්න ඕන අලුත් පේළිය:
CMD ["pm2-runtime", "start", "index.js", "--name", "mizuki-md"]