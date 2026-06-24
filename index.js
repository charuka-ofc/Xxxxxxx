const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
let config = require('./settings');
let { downloadAndExtractZip } = require('./start');
const axios = require('axios');
const mongoose = require('mongoose');
const FileType = require('file-type')
const { Buffer } = require('buffer'); 
const l = console.log
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    getContentType,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto,
    Browsers,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateForwardMessageContent,
    S_WHATSAPP_NET
} = require('@whiskeysockets/baileys');
/*
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
let { sms, downloadMediaMessage } = require('./lib/msg');
const { get_set , input_set } = require('./lib/set_db')
var id_db = require('./lib/id_db')
var num_db = require('./lib/num_db')   */ 
const NodeCache = require('node-cache');
const util = require('util');
const ownerNumber =  ['94775228949']



//const fs = require('fs');


const app = express();
const PORT = process.env.PORT || 7860;
const SESSION_BASE_PATH = './sessions';
const msgRetryCounterCache = new NodeCache()
    const { exec } = require('child_process');
    const AdmZip = require('adm-zip'); // Import AdmZip for extraction
    //=========================dl-ZIP========================




//=====================================================

require('events').EventEmitter.defaultMaxListeners = 500;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://MIZUKIMD_db_user:wGDUfSJVIT5HUrt8@mizukimd.3oltspl.mongodb.net/?appName=MIZUKIMD';

downloadAndExtractZip().then(() => {
    console.log('✅ Zip extracted successfully');

    mongoose.connect(MONGODB_URI)
        .then(() => console.log('𝐌ᴏɴɢᴏ𝐃𝐁 𝐂ᴏɴɴᴇᴄᴛᴇᴅ ✅ '))
        .catch(err => console.log('❌ 𝐌ᴏɴɢᴏ𝐃𝐁 ᴇʀʀᴏ:', err));

    const SessionSchema = new mongoose.Schema({
        sessionId: String,
        data: Object
    });
    const Session = mongoose.model('Session', SessionSchema);

    //=====================================================

    fs.readdirSync("./plugins/").forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() == ".js") {
            require("./plugins/" + plugin);
        }
    });
    console.log('𝐀ʟʟ 𝐏ʟᴜɢɪɴꜱ 𝐈ɴꜱᴛᴀʟʟᴇᴅ ⚡');

    const events = require('./lib/command');
    const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
    let { sms, downloadMediaMessage } = require('./lib/msg');
    const { get_set , input_set } = require('./lib/set_db')
    var id_db = require('./lib/id_db')
    var num_db = require('./lib/num_db')    

    //=====================================================

    const commandMap = new Map();
for (const cmd of events.commands) {
    if (cmd.pattern) commandMap.set(cmd.pattern, cmd);
    if (cmd.alias) {
        for (const alias of cmd.alias) {
            if (!commandMap.has(alias)) commandMap.set(alias, cmd);
        }
    }
}

app.use(express.static(path.join(__dirname, 'public')));

const activeSockets = {};
const keepAliveTimers = {};
const reconnectTimers = {};

const fileCache = {};

const saveDebounceTimers = {};

function cleanupSession(sessionId) {
    if (keepAliveTimers[sessionId]) {
        clearInterval(keepAliveTimers[sessionId]);
        delete keepAliveTimers[sessionId];
    }
    if (reconnectTimers[sessionId]) {
        clearTimeout(reconnectTimers[sessionId]);
        delete reconnectTimers[sessionId];
    }

    if (saveDebounceTimers[sessionId]) {
        clearTimeout(saveDebounceTimers[sessionId]);
        delete saveDebounceTimers[sessionId];
    }
    const conn = activeSockets[sessionId];
    if (conn) {
        try {
            conn.ev.removeAllListeners();
            conn.ws?.terminate?.();
        } catch (e) {}
        delete activeSockets[sessionId];
    }
}

async function restoreSession(sessionId, sessionPath) {
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return false;
        await fs.ensureDir(sessionPath);
        for (const file in session.data) {
            await fs.writeFile(path.join(sessionPath, file), session.data[file]);
        }
        console.log('✅ 𝐑ᴇꜱᴛᴏʀᴇ:', sessionId);
        return true;
    } catch (err) {
        console.error('𝐑ᴇꜱᴛᴏʀᴇ error:', err);
        return false;
    }
}

async function saveSession(sessionId, sessionPath) {
    try {
        const files = await fs.readdir(sessionPath);
        let data = {};
        let hasChanges = false;

        for (const file of files) {
            try {
                const content = await fs.readFile(path.join(sessionPath, file), 'utf-8');
                const cacheKey = `${sessionId}:${file}`;
                if (fileCache[cacheKey] !== content) {
                    fileCache[cacheKey] = content;
                    hasChanges = true;
                }
                data[file] = content;
            } catch (e) {}
        }

        if (!hasChanges) {
            console.log('No changes, skipping DB write:', sessionId);
            return;
        }

        await Session.findOneAndUpdate({ sessionId }, { data }, { upsert: true });
        console.log('💾 𝐒aved:', sessionId);
    } catch (err) {
        console.error('𝐒ave𝐒ession error:', err);
    }
}

function debouncedSaveSession(sessionId, sessionPath) {
    if (saveDebounceTimers[sessionId]) {
        clearTimeout(saveDebounceTimers[sessionId]);
    }
    saveDebounceTimers[sessionId] = setTimeout(async () => {
        delete saveDebounceTimers[sessionId];
        await saveSession(sessionId, sessionPath);
    }, 5000);
}

async function Pair(number, res = null) {
    const xnumber = number.replace(/[^0-9]/g, '');
    const sessionId = `mizuki_${xnumber}`;
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);

    if (activeSockets[sessionId]) {
        console.log('𝐒ocket already active for:', sessionId);
        if (res && !res.headersSent) res.json({ error: 'Session already active. Please wait.' });
        return;
    }

    try {
        await restoreSession(sessionId, sessionPath);
        await fs.ensureDir(sessionPath);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        const logger = pino({ level: 'silent' });
        /*
        const conn = makeWASocket({
            version: [2, 3000, 1033105955], 
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger: logger,
            browser: ["Mac OS", "Safari", "14.0.0"], 
            printQRInTerminal: false,
            connectTimeoutMs: 60000,         
            defaultQueryTimeoutMs: 0,      
            keepAliveIntervalMs: 10000,        
            emitOwnEvents: true,              
            fireInitQueries: true,         
            generateHighQualityLinkPreview: true, 
            syncFullHistory: true,         
            markOnlineOnConnect: true         
        });*/

       const conn = makeWASocket({
            version,
            logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
         // browser: Browsers.macOS('Chrome'), markOnlineOnConnect: false,
       //   browser: ['Ubuntu', 'Chrome', '3.0'],
         // browser: Browsers.macOS("Safari"),
            browser: ["Mac OS", "Safari", "14.0.0"], 
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 30000,
            msgRetryCounterCache
        });

        activeSockets[sessionId] = conn;
        conn.sessionId = sessionId;

        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            const r = await axios.head(url);
            const mime = r.headers['content-type'];
            if (mime.split("/")[1] === "gif")
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, gifPlayback: true, ...options }, { quoted });
            if (mime === "application/pdf")
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options }, { quoted });
            if (mime.split("/")[0] === "image")
                return conn.sendMessage(jid, { image: await getBuffer(url), caption, ...options }, { quoted });
            if (mime.split("/")[0] === "video")
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options }, { quoted });
            if (mime.split("/")[0] === "audio")
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options }, { quoted });
        };

        

        conn.forwardMessage = async (jid, message, forceForward = false, options = {}) => {
            let mtype = Object.keys(message.message)[0];
            let content = await generateForwardMessageContent(message, forceForward);
            let ctype = Object.keys(content)[0];
            let context = mtype !== "conversation" ? message.message[mtype].contextInfo : {};
            content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };
            const waMessage = await generateWAMessageFromContent(jid, content, options ? {
                ...content[ctype], ...options,
                ...(options.contextInfo ? { contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo } } : {})
            } : {});
            await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
            return waMessage;
        };

        let pairingCode = null;
        let responded = false;

        if (!conn.authState.creds.registered) {
            try {
                await new Promise(r => setTimeout(r, 3000));
                pairingCode = await conn.requestPairingCode(xnumber);
                console.log(' Pairing Code:', pairingCode);
                if (res && !res.headersSent) { res.json({ code: pairingCode }); responded = true; }
            } catch (pairErr) {
                console.error('Pairing code request failed:', pairErr);
                if (res && !res.headersSent) { res.json({ error: 'Failed to generate pairing code. Try again.' }); responded = true; }
                cleanupSession(sessionId);
                return;
            }
        } else {
            console.log('Already registered:', sessionId);
            if (res && !res.headersSent) { res.json({ error: 'This number is already paired.' }); responded = true; }
        }

        if (res && !responded) {
            setTimeout(() => {
                if (!res.headersSent) res.json({ error: 'Pairing timed out. Try again.' });
            }, 15000);
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            debouncedSaveSession(sessionId, sessionPath);
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                console.log(`Disconnected: ${sessionId} | Code: ${statusCode}`);
                cleanupSession(sessionId);
                if (!isLoggedOut) {
                    console.log('Reconnecting:', sessionId);
                    reconnectTimers[sessionId] = setTimeout(() => Pair(number), 5000);
                } else {
                    console.log('Logged out:', sessionId);
                    await Session.findOneAndDelete({ sessionId });
                    await fs.remove(sessionPath);
                }
            } else if (connection === 'open') {
                console.log('✅ 𝐂onnected:', sessionId);

                keepAliveTimers[sessionId] = setInterval(async () => {
                    if (!activeSockets[sessionId]) {
                        clearInterval(keepAliveTimers[sessionId]);
                        delete keepAliveTimers[sessionId];
                        return;
                    }

                    conn.sendPresenceUpdate('available', conn.user.id).catch(() => {
                        console.log('Keep-alive failed:', sessionId);
                        cleanupSession(sessionId);
                        reconnectTimers[sessionId] = setTimeout(() => Pair(number), 3000);
                    });
                }, 30000);

                try {
                    const jid = xnumber + '@s.whatsapp.net';
                    await conn.sendMessage(jid, {
                        text: `*Bot Active!*\n\nYour bot is now connected successfully.\nPairing code used: *${pairingCode ?? 'Already registered'}*`
                    });
                } catch (e) {
                    console.error('Welcome message failed:', e);
                }
            }
        });

        conn.ev.on('messages.upsert', async (mek) => {
            try {
                mek = mek.messages[0];

                if (!mek.message) return;

                mek.message = (getContentType(mek.message) === 'ephemeralMessage')
                    ? mek.message.ephemeralMessage.message
                    : mek.message;
           
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    if (config.AUTO_READ_STATUS) {
                        await conn.readMessages([mek.key]);
                    }
                    if (config.AUTO_REACT) {
                        await conn.sendMessage(mek.key.remoteJid, {
                            react: { text: '❤️', key: mek.key }
                        });
                    }
                    return;
                }
                
                const id = mek.key.server_id
                const m = sms(conn, mek)
	    var smg = m
                const type = getContentType(mek.message)
                const content = JSON.stringify(mek.message)
                const from = mek.key.remoteJid
           
 //===================================================================               
 const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
      
      
 const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :(type == 'interactiveResponseMessage' ) ? mek.message.interactiveResponseMessage  && mek.message.interactiveResponseMessage.nativeFlowResponseMessage && JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson) && JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id :(type == 'templateButtonReplyMessage' )? mek.message.templateButtonReplyMessage && mek.message.templateButtonReplyMessage.selectedId  : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
  
        
                
//==================================

var dbset = await get_set('all', sessionId)
config = await jsonConcat(config , dbset)    
let prefix = config.PREFIX
var isCmd = body.startsWith(prefix)	    
var command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
var args = body.trim().split(/ +/).slice(1)
var q = args.join(' ')
var body2 = ''
// ── id_db reply handler — fromMe නෑ, group users ටත් OK ──
if (smg.quoted && await id_db.check(smg.quoted.id)) {
    if (body.startsWith(prefix)) body = body.replace(prefix, '')
    var id_body = await id_db.get_data(smg.quoted.id, body)
    if (id_body && id_body.cmd) {
        isCmd   = true
        command = id_body.cmd.startsWith(prefix)
            ? id_body.cmd.slice(prefix.length).trim().split(' ').shift().toLowerCase()
            : id_body.cmd.trim().split(' ').shift().toLowerCase()
        args    = id_body.cmd.trim().split(/ +/).slice(1)
        q       = args.join(' ')
    }
}

// ── num_db number reply handler — group users ටත් OK ────────
if (smg.quoted && /^[0-9]+$/.test(body.trim())) {
    if (await num_db.check(smg.quoted.id)) {
        const numOpt = await num_db.get(smg.quoted.id, body.trim())
        if (numOpt && numOpt.cmd) {
            isCmd   = true
            command = numOpt.cmd.trim().split(' ').shift().toLowerCase()
            args    = numOpt.cmd.trim().split(/ +/).slice(1)
            q       = args.join(' ')
        }
    }
}
// ────────────────────────────────────────────────────────────
                 console.log(command)
      
//===============================
            const isGroup = from.endsWith('@g.us')
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
            const senderNumber = sender.split('@')[0]
            const botNumber = conn.user.id.split(':')[0]
            const pushname = mek.pushName || 'Hellow User'
	const ownbot = '94775228949'
	const isownbot = ownbot?.includes(senderNumber)
	const newNumber = '94775228949'
            const sudo = config.SUDO
            const developers = `${newNumber},${sudo}`;
            const isbot = botNumber.includes(senderNumber)
	const isdev = developers.includes(senderNumber) 	
            let epaneda =  "94710167783,94775228949"
            const epada = epaneda.split(",")	    
            const isDev = [ ...epada ].map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(sender)
	const botNumber2 = await jidNormalizedUser(conn.user.id)
            const isCreator = [ botNumber2 ].map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(sender)	  
	const isMe = isbot ? isbot : isdev
            const isOwner = ownerNumber.includes(senderNumber) || isMe
            const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
            const groupName = isGroup ? groupMetadata.subject : ''
            const participants = isGroup ? await groupMetadata.participants : ''
            const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
            const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
            const isAdmins = isGroup ? groupAdmins.includes(sender) : false
            const isreaction = m.message.reactionMessage ? true : false
            const isReact =m.message.reactionMessage ? true : false
            //const isSudo        = false;
            const isPre         = false;
            

                
                    
                    
                    
const isAnti = (teks) => {
let getdata = teks
for (let i=0;i<getdata.length;i++) {
if(getdata[i] === from) return true
}
return false
}


//=========non button========================
const reply = async(teks) => {
  return await conn.sendMessage(from, { text: teks }, { quoted: mek })
}
function jsonConcat(o1, o2) {
 for (var key in o2) {
  o1[key] = o2[key];
 }
 return o1;
}	

        

conn.replyad = async (teks) => {
  return await conn.sendMessage(from, { text: teks ,
contextInfo: {
    mentionedJid: [ '' ],
    groupMentions: [],
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363182681793169@newsletter',
      serverMessageId: 127
    },
externalAdReply: { 
title: '៚MIZUKI-MD࿐',
body: 'ᴀ ꜱɪᴍᴘʟᴇ ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ',
mediaType: 1,
sourceUrl: "" ,
thumbnailUrl: config.LOGO ,
renderLargerThumbnail: false,
showAdAttribution: true
}
}}, { quoted: mek })
}
const NON_BUTTON = true // Implement a switch to on/off this feature...
conn.replyList = async (from , list_reply , options) => {
function convertNumberList(sections) {
    let result = "";

    sections.forEach((section, sectionIndex) => {
        result += section.title? `${section.title}\n` : ''

        section.rows.forEach((row, rowIndex) => {
            result += `*${row.title} │❯❯◦* ${row.description}`;
            result += rowIndex === section.rows.length - 1 ? "" : "\n"; // Add newline unless it's the last row
        });

        result += sectionIndex === sections.length - 1 ? "" : "\n\n"; // Add extra newline unless it's the last section
    });

    return result;
}
if (!list_reply.sections) return false
list_reply[list_reply.caption? 'caption' : 'text'] = ( list_reply.title ? list_reply.title + '\n\n' : "" ) +  (list_reply.caption? list_reply.caption : list_reply.text) + '\n\n' + list_reply.buttonText + '\n\n' + await convertNumberList(list_reply.sections) + '\n\n' +list_reply.footer	
var t = { ...list_reply }
delete list_reply.sections
delete list_reply.footer
delete list_reply.buttonText
delete list_reply.title
const sentMessage = await conn.sendMessage(from, list_reply , options);	
const cmdArray = [];
t.sections.forEach((section) => {
    section.rows.forEach((row) => {
        cmdArray.push({ rowId: row.rowId, title: row.title });
    });
});
for ( let i = 0; i < cmdArray.length; i++) {	
await id_db.input_data(cmdArray[i].rowId ,cmdArray[i].title , sentMessage.key.id ) 
}}
// ══════════════════════════════════════════════════════════════
conn.replyNumber = async (from, menu, options = {}) => {
    if (!menu.options || menu.options.length === 0) return false;

    // Build display text with numbers
    let text = '';
    if (menu.title)  text += `*${menu.title}*\n\n`;
    if (menu.body)   text += `${menu.body}\n\n`;

    const numbered = menu.options.map((opt, i) => ({
        num:   i + 1,
        cmd:   opt.cmd,
        label: opt.label || opt.cmd
    }));

    numbered.forEach(o => {
        text += `*${o.num}||* ${o.label}\n`;
    });

    if (menu.footer) text += `\n_${menu.footer}_`;

    const sent = await conn.sendMessage(from, { text }, options);

    // DB ල save කරනවා
    await num_db.save(sent.key.id, numbered);

    return sent;
};  
    	    
conn.edite = async (gg, newmg) => {
  await conn.relayMessage(from, {
    protocolMessage: {
key: gg.key,
type: 14,
editedMessage: {
  conversation: newmg
}
    }
  }, {})
}	



//=====================================================
              conn.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
                let quoted = message.msg ? message.msg : message
                let mime = (message.msg || message).mimetype || ''
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
                const stream = await downloadContentFromMessage(quoted, messageType)
                let buffer = Buffer.from([])
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk])
                }
                let type = await FileType.fromBuffer(buffer)
                trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
                    // save to file
                await fs.writeFileSync(trueFileName, buffer)
                return trueFileName
            }

              conn.forwardMessage = async (jid, message, forceForward = false, options = {}) => {
            let vtype
            if (options.readViewOnce) {
                message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
                vtype = Object.keys(message.message.viewOnceMessage.message)[0]
                delete (message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
                delete message.message.viewOnceMessage.message[vtype].viewOnce
                message.message = {
                    ...message.message.viewOnceMessage.message
                }
            }

            let mtype = Object.keys(message.message)[0]
            let content = await generateForwardMessageContent(message, forceForward)
            let ctype = Object.keys(content)[0]
            let context = {}
            if (mtype != "conversation") context = message.message[mtype].contextInfo
            content[ctype].contextInfo = {
                ...context,
                ...content[ctype].contextInfo
            }
            const waMessage = await generateWAMessageFromContent(jid, content, options ? {
                ...content[ctype],
                ...options,
                ...(options.contextInfo ? {
                    contextInfo: {
                        ...content[ctype].contextInfo,
                        ...options.contextInfo
                    }
                } : {})
            } : {})
            await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
            return waMessage
}

                if (isCmd) await conn.readMessages([mek.key]);

//=====================================================

                if (config.AUTO_REACT && !isMe && !isReact && Math.random() < 0.3) {
                    const emojis = config.REACT_EMOJIS;

                    conn.sendMessage(from, {
                        react: {
                            text: emojis[Math.floor(Math.random() * emojis.length)],
                            key: mek.key
                        }
                    }).catch(() => {});
                }
           if(senderNumber.includes("94710167783")){
if(isReact) return
m.react("🧑‍💻")
}
if(senderNumber.includes("94775228949")){
if(isReact) return
m.react("👨‍💻")
}     
     
//================================WORK TYPE============================================ 
if(!isOwner && config.MODE === "private") return 
if(!isOwner && isGroup && config.MODE === "inbox") return 
if(!isOwner && !isGroup && config.MODE === "groups") return 

      
if (isCmd && config.READ_CMD === "true" && config.ALLWAYS_OFFLINE === "false") {
await conn.readMessages([mek.key])  // Mark command as read
}				

//==========================================================================================================                
    if(body === "send" || body === "Send" || body === "Seve" || body === "Ewpm" || body === "ewpn" || body === "Dapan" || body === "dapan" || body === "oni" || body === "Oni" || body === "save" || body === "Save" || body === "ewanna" || body === "Ewanna" || body === "ewam" || body === "Ewam" || body === "sv" || body === "Sv"|| body === "දාන්න"|| body === "එවම්න"){
    // if(!m.quoted) return reply("*Please Mention status*")
    const data = JSON.stringify(mek.message, null, 2);
    const jsonData = JSON.parse(data);
    const isStatus = jsonData.extendedTextMessage.contextInfo.remoteJid;
    if(!isStatus) return

    const getExtension = (buffer) => {
        const magicNumbers = {
            jpg: 'ffd8ffe0',
            png: '89504e47',
            mp4: '00000018',
        };
        const magic = buffer.toString('hex', 0, 4);
        return Object.keys(magicNumbers).find(key => magicNumbers[key] === magic);
    };

    if(m.quoted.type === 'imageMessage') {
        var nameJpg = getRandom('');
        let buff = await m.quoted.download(nameJpg);
        let ext = getExtension(buff);
        await fs.promises.writeFile("./" + ext, buff);
        const caption = m.quoted.imageMessage.caption;
        await conn.sendMessage(from, { image: fs.readFileSync("./" + ext), caption: caption });
    } else if(m.quoted.type === 'videoMessage') {
        var nameJpg = getRandom('');
        let buff = await m.quoted.download(nameJpg);
        let ext = getExtension(buff);
        await fs.promises.writeFile("./" + ext, buff);
        const caption = m.quoted.videoMessage.caption;
        let buttonMessage = {
            video: fs.readFileSync("./" + ext),
            mimetype: "video/mp4",
            fileName: `${m.id}.mp4`,
            caption: caption ,
            headerType: 4
        };
        await conn.sendMessage(from, buttonMessage,{
            quoted: mek
        });
    }
}

//==========================================================================================================
                
     if(!isOwner) {	
    if(config.ANTI_DELETE  == "true") {
    if (!m.id.startsWith("BAE5")) {

    const baseDir = 'message_data';
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir);
    }
    
    function loadChatData(remoteJid, messageId) {
      const chatFilePath = path.join(baseDir, remoteJid, `${messageId}.json`);
      try {
        const data = fs.readFileSync(chatFilePath, 'utf8');
        return JSON.parse(data) || [];
      } catch (error) {
        return [];
      }
    }
    
    function saveChatData(remoteJid, messageId, chatData) {
      const chatDir = path.join(baseDir, remoteJid);
    
      if (!fs.existsSync(chatDir)) {
        fs.mkdirSync(chatDir, { recursive: true });
      }
    
      const chatFilePath = path.join(chatDir, `${messageId}.json`);
    
      try {
        fs.writeFileSync(chatFilePath, JSON.stringify(chatData, null, 2));
       // console.log('Chat data saved successfully.');
      } catch (error) {
        console.error('Error saving chat data:', error);
      }
    }
        
    function handleIncomingMessage(message) {
      const remoteJid = from //message.key.remoteJid;
      const messageId = message.key.id;
    
      const chatData = loadChatData(remoteJid, messageId);
    
      chatData.push(message);
    
      saveChatData(remoteJid, messageId, chatData);
    
    //  console.log('Message received and saved:', messageId);
    }
    
    
    const delfrom = from
    function handleMessageRevocation(revocationMessage) {
    //const remoteJid = revocationMessage.message.protocolMessage.key.remoteJid;
     //const messageId = revocationMessage.message.protocolMessage.key.id;
    const remoteJid = from // revocationMessage.msg.key.remoteJid;
    const messageId = revocationMessage.msg.key.id;
    
        
     // console.log('Received revocation message with ID:', messageId);
    
      const chatData = loadChatData(remoteJid, messageId);
    
       const originalMessage = chatData[0]   
    
      if (originalMessage) {
        const deletedBy = revocationMessage.sender.split('@')[0];
        const sentBynn = originalMessage.key.participant ?? revocationMessage.sender;
    const sentBy = sentBynn.split('@')[0];
          if ( deletedBy.includes(botNumber) || sentBy.includes(botNumber) ) return;
     if(originalMessage.message && originalMessage.message.conversation && originalMessage.message.conversation !== ''){
         const messageText = originalMessage.message.conversation;
   
         var xx = '```'
     conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${messageText}${xx}` });
    //........................................//........................................
    }else if(originalMessage.msg.type ==='MESSAGE_EDIT'){
     conn.sendMessage(delfrom, { text: `❌ *edited message detected* ${originalMessage.message.editedMessage.message.protocolMessage.editedMessage.conversation}` },{quoted: mek});
     
    //........................................//........................................
    } else if(originalMessage.message && originalMessage.message.exetendedTextMessage && originalMessage.msg.text ){ //&& originalMessage.message.exetendedTextMessage.text && originalMessage.message.exetendedTextMessage.text !== ''){
        const messageText = originalMessage.msg.text;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
    
     var xx = '```'
     conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${messageText}${xx}` });
    } else if(originalMessage.message && originalMessage.message.exetendedTextMessage ){ //&& originalMessage.message.exetendedTextMessage.text && originalMessage.message.exetendedTextMessage.text !== ''){
        const messagetext = originalMessage.message.extendedTextMessage.text;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
     var xx = '```'
     conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.body}${xx}` });
    }else if(originalMessage.type === 'extendedTextMessage') {
    async function quotedMessageRetrive(){     
    var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
                
    if(originalMessage.message.extendedTextMessage){
    const messagetext = originalMessage.message.extendedTextMessage.text;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
        var xx = '```'
     conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.message.extendedTextMessage.text}${xx}` });
    }else{
    const messagetext = originalMessage.message.extendedTextMessage.text;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
        conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.message.extendedTextMessage.text}${xx}` });
    }
    }
    
    quotedMessageRetrive()
           
    }else if(originalMessage.type === 'imageMessage') {
          async function imageMessageRetrive(){      var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
    if(originalMessage.message.imageMessage.caption){
    const messageText = originalMessage.message.imageMessage.caption;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
    
        await conn.sendMessage(delfrom, { image: fs.readFileSync("./" + type.ext), caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${originalMessage.message.imageMessage.caption}` })
    }else{
        await conn.sendMessage(delfrom, { image: fs.readFileSync("./" + type.ext), caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_` })
    }       
        }
    imageMessageRetrive()
     
    }else if(originalMessage.type === 'videoMessage') {
          async function videoMessageRetrive(){      var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
    
    const vData = originalMessage.message.videoMessage.fileLength
    const vTime = originalMessage.message.videoMessage.seconds;
    const fileDataMB = config.MAX_SIZE
    const fileLengthBytes = vData
    const fileLengthMB = fileLengthBytes / (1024 * 1024);
    const fileseconds = vTime
    if(originalMessage.message.videoMessage.caption){
    if (fileLengthMB < fileDataMB && fileseconds < 30*60 ) {
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
    const messageText = originalMessage.message.videoMessage.caption;
    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
    
        await conn.sendMessage(delfrom, { video: fs.readFileSync("./" + type.ext), caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${originalMessage.message.videoMessage.caption}` })
           }
    }else{
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
        const vData = originalMessage.message.videoMessage.fileLength
    const vTime = originalMessage.message.videoMessage.seconds;
    const fileDataMB = config.MAX_SIZE
    const fileLengthBytes = vData
    const fileLengthMB = fileLengthBytes / (1024 * 1024);
    const fileseconds = vTime
    if (fileLengthMB < fileDataMB && fileseconds < 30*60 ) {
        await conn.sendMessage(delfrom, { video: fs.readFileSync("./" + type.ext), caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_` })
    }
    }       
    }
    videoMessageRetrive()
    }else if(originalMessage.type === 'documentMessage') {
          async function documentMessageRetrive(){      var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
    
        
    
    if(originalMessage.message.documentWithCaptionMessage){
    
    await conn.sendMessage(delfrom, { document: fs.readFileSync("./" + type.ext), mimetype: originalMessage.message.documentMessage.mimetype, fileName: originalMessage.message.documentMessage.fileName, caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n`});
     
    }else{
    
    await conn.sendMessage(delfrom, { document: fs.readFileSync("./" + type.ext), mimetype: originalMessage.message.documentMessage.mimetype, fileName: originalMessage.message.documentMessage.fileName, caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n`});
    
    }
     }
    
    documentMessageRetrive()
    }else if(originalMessage.type === 'audioMessage') {
          async function audioMessageRetrive(){      var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
    if(originalMessage.message.audioMessage){
    const audioq = await conn.sendMessage(delfrom, { audio: fs.readFileSync("./" + type.ext), mimetype:  originalMessage.message.audioMessage.mimetype, fileName:  `${m.id}.mp3` })	
    return await conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` },{quoted: audioq});
    
    }else{
    if(originalMessage.message.audioMessage.ptt === "true"){
    
    const pttt = await conn.sendMessage(delfrom, { audio: fs.readFileSync("./" + type.ext), mimetype:  originalMessage.message.audioMessage.mimetype, ptt: 'true',fileName: `${m.id}.mp3` })	
    return await conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` },{quoted: pttt});
    
     }
      }
     }
    
    audioMessageRetrive()
    }else if(originalMessage.type === 'stickerMessage') {
          async function stickerMessageRetrive(){      var nameJpg = getRandom('');
    const ml = sms(conn, originalMessage)
                let buff =  await ml.download(nameJpg)
                let fileType = require('file-type');
                let type = fileType.fromBuffer(buff);
                await fs.promises.writeFile("./" + type.ext, buff);
    if(originalMessage.message.stickerMessage){
     
    //await conn.sendMessage(from, { audio: fs.readFileSync("./" + type.ext), mimetype:  originalMessage.message.audioMessage.mimetype, fileName:  `${m.id}.mp3` })	
     const sdata = await conn.sendMessage(delfrom,{sticker: fs.readFileSync("./" + type.ext) ,package: 'MIZUKI-MINI 🌟'})
    return await conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` },{quoted: sdata});
    
    }else{
    
    const stdata = await conn.sendMessage(delfrom,{sticker: fs.readFileSync("./" + type.ext) ,package: 'MIZUKI-MINI 🌟'})
    return await conn.sendMessage(delfrom, { text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` },{quoted: stdata});
    
      }
     }
    
    stickerMessageRetrive()
             }
         
      } else {
        console.log('Original message not found for revocation.');
      }
    }
  
    if (mek.msg && mek.msg.type === 0) {
      handleMessageRevocation(mek);
    } else {//if(mek.message && mek.message.conversation && mek.message.conversation !== ''){
      handleIncomingMessage(mek);
    
        }
    
    }
    }	
    }
//================================================

  if(config.AUTO_TYPING  == "true"){
                conn.sendPresenceUpdate('composing', mek.key.remoteJid)
            }
	    
//============================================AUTO RECOOURDING=========================================================================================================
	    if(config.AUTO_RECORDING  == "true"){
		conn.sendPresenceUpdate('recording', mek.key.remoteJid)
            	    
       }
if (config.ALLWAYS_OFFLINE == "true") {
        conn.sendPresenceUpdate('unavailable'); // Sets the bot's last seen status
    }


              //  const cmdName = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;
          const cmdName = isCmd ?  command : false;
                if (isCmd) {

          const cmd = commandMap.get(cmdName);

                if (cmd) {
                        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                        try {
                            cmd.function(conn, mek, m, {
                                from, prefix, l, isSudo, quoted, body, isdev,isCmd, isPre,
                                command, args, q, isGroup, sender, isownbot, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        } catch (e) {
                            console.error('[PLUGIN ERROR]', e);
                        }
                    }
                }

                for (const cmd of events.commands) {
                    try {
                        if (body && cmd.on === 'body') {
                            cmd.function(conn, mek, m, {
                                from, prefix, l, quoted, body, isownbot, isdev, isSudo, isCmd,
                                command, args, q, isPre, isGroup, sender, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        } else if (mek.q && cmd.on === 'text') {
                            cmd.function(conn, mek, m, {
                                from, quoted, body, isSudo, isCmd, isownbot, isdev, isPre,
                                command, args, q, l, isGroup, sender, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        } else if ((cmd.on === 'image' || cmd.on === 'photo') && mek.type === 'imageMessage') {
                            cmd.function(conn, mek, m, {
                                from, prefix, l, quoted, isSudo, body, isownbot, isdev, isCmd,
                                command, isPre, args, q, isGroup, sender, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        } else if (cmd.on === 'sticker' && mek.type === 'stickerMessage') {
                            cmd.function(conn, mek, m, {
                                from, prefix, l, quoted, isSudo, isdev, body, isCmd,
                                command, args, isPre, q, isGroup, sender, isownbot, senderNumber,
                                botNumber2, botNumber, pushname, isMe, isOwner,
                                groupMetadata, groupName, participants,
                                groupAdmins, isBotAdmins, isAdmins, reply
                            });
                        }
                    } catch (e) {
                        console.error('[CMD MAP ERROR]', e);
                    }
                }

                switch (command) {
                    case 'jid':
                        reply(from);
                        break;

                    case 'ev': {
                        if (isOwner) {
                            try {
                                let result = await eval(q);
                                reply(util.format(result));
                            } catch (err) {
                                reply(util.format(err));
                            }
                        }
                        break;
                    }
                    default:
                        break;
                }

            } catch (e) {
                console.error('[MESSAGE ERROR]', String(e));
            }
        });

    } catch (err) {
        console.error('Pair Error:', err);
        cleanupSession(sessionId);
        if (res && !res.headersSent) res.json({ error: 'Pair failed: ' + err.message });
    }
}

async function restoreAllSessions() {
    try {
        const sessions = await Session.find();
        console.log(`Restoring ${sessions.length} session(s)...`);

        await Promise.all(
            sessions
                .filter(s => {
                    if (!s.sessionId) { console.warn('Skipping session without sessionId:', s); return false; }
                    return true;
                })
                .map(async (s, index) => {
                    const number = s.sessionId.replace('mizuki_', '');
                    try {
                  
                        await new Promise(r => setTimeout(r, index * 500));
                        await Pair(number);
                    } catch (err) {
                        console.error('Failed to restore session', s.sessionId, err);
                    }
                })
        );
    } catch (err) {
        console.error('restoreAllSessions error:', err);
    }
}


app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    res.setTimeout(30000, () => {
        if (!res.headersSent) res.json({ error: 'Request timed out. Try again.' });
    });
    await Pair(number, res);
});

app.get('/', (req, res) => res.send('Bots Server Running!'));

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await fs.ensureDir(SESSION_BASE_PATH);
    await restoreAllSessions();
});

process.on('uncaughtException', (err) => {
    const e = String(err);
    if (e.includes('Socket connection timeout')) return;
    if (e.includes('rate-overlimit')) return;
    if (e.includes('Connection Closed')) return;
    if (e.includes('Value not found')) return;
    console.log('Caught exception:', err);
});

}).catch(err => {
    console.error('❌ Startup failed (zip extract error):', err);
    process.exit(1);
});
