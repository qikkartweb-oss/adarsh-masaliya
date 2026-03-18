import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore,
  WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import db from './db.ts';
import pino from 'pino';

const logger = pino({ level: 'silent' });

export class WhatsAppManager {
  private sessions: Map<number, WASocket> = new Map();
  private io: any;

  constructor(io: any) {
    this.io = io;
    this.initExistingSessions();
  }

  private async initExistingSessions() {
    const authDir = path.join(process.cwd(), 'auth');
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);
    
    const users = fs.readdirSync(authDir);
    for (const userIdStr of users) {
      const userId = parseInt(userIdStr);
      if (!isNaN(userId)) {
        console.log(`Restoring session for user ${userId}`);
        this.initSession(userId);
      }
    }
  }

  public async initSession(userId: number) {
    if (this.sessions.has(userId)) return;

    const authDir = path.join(process.cwd(), 'auth', userId.toString());
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
    });

    this.sessions.set(userId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.io.emit(`qr-${userId}`, qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        this.sessions.delete(userId);
        if (shouldReconnect) {
          this.initSession(userId);
        } else {
          // Logged out, clean up auth folder
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        console.log('opened connection for user ', userId);
        this.io.emit(`status-${userId}`, 'connected');
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid!;
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const pushName = msg.pushName || 'Unknown';

            // Save inbound message
            db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, text, 'inbound');
            
            // Save contact
            db.prepare('INSERT OR IGNORE INTO contacts (user_id, phone, name) VALUES (?, ?, ?)').run(userId, from, pushName);

            // Fetch User Session
            let session: any = db.prepare('SELECT * FROM user_sessions WHERE phone = ? AND user_id = ?').get(from, userId);
            if (!session) {
              db.prepare('INSERT INTO user_sessions (phone, user_id) VALUES (?, ?)').run(from, userId);
              session = { phone: from, user_id: userId, current_menu_id: null };
            }

            // Handle Session Reset
            if (['exit', 'cancel', 'reset', 'stop'].includes(text.toLowerCase())) {
              db.prepare('UPDATE user_sessions SET current_menu_id = NULL WHERE phone = ? AND user_id = ?').run(from, userId);
              await sock.sendMessage(from, { text: "Session reset. Send 'hi' to see the menu again." });
              return;
            }

            // Handle Menu Trigger (hi, menu)
            if (['hi', 'hello', 'menu', 'start'].includes(text.toLowerCase())) {
              console.log(`[WA] Menu trigger detected from ${from}: ${text}`);
              let mainMenu: any = db.prepare('SELECT * FROM menus WHERE user_id = ? AND is_main = 1 AND enabled = 1').get(userId);
              
              // Fallback: if no main menu, use the first enabled menu
              if (!mainMenu) {
                mainMenu = db.prepare('SELECT * FROM menus WHERE user_id = ? AND enabled = 1 LIMIT 1').get(userId);
              }

              if (mainMenu) {
                console.log(`[WA] Sending menu ${mainMenu.id} to ${from}`);
                await this.sendMenu(sock, from, mainMenu.id, userId);
                return;
              } else {
                console.log(`[WA] No enabled menus found for user ${userId}`);
              }
            }

            // Handle Menu Selection (Numeric)
            if (session.current_menu_id) {
              const option: any = db.prepare('SELECT * FROM menu_options WHERE menu_id = ? AND trigger_number = ?').get(session.current_menu_id, text);
              if (option) {
                await this.handleMenuAction(sock, from, option, userId);
                return;
              } else if (/^\d+$/.test(text)) {
                // If user sent a number but it's not a valid option, re-send the menu
                await this.sendMenu(sock, from, session.current_menu_id, userId);
                return;
              }
            }

            // Handle Chatbot Rules (Fallback if no menu option matched)
            const rules: any[] = db.prepare('SELECT * FROM chatbot_rules WHERE user_id = ?').all(userId);
            for (const rule of rules) {
              if (text.toLowerCase() === rule.keyword.toLowerCase()) {
                await sock.sendMessage(from, { text: rule.reply });
                db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, rule.reply, 'outbound');
                return;
              }
            }

            // Handle Booking Flow (Legacy/Fallback)
            if (text.toLowerCase() === 'book') {
              const reply = "Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday";
              await sock.sendMessage(from, { text: reply });
              db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, reply, 'outbound');
            } else if (['1', '2', '3'].includes(text) && text.length === 1 && !session.current_menu_id) {
              const days = { '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday' };
              const day = days[text as keyof typeof days];
              const reply = `Great! You've booked for ${day}. We will contact you soon.`;
              await sock.sendMessage(from, { text: reply });
              
              db.prepare('INSERT INTO bookings (user_id, customer_phone, booking_date, booking_time) VALUES (?, ?, ?, ?)').run(userId, from, day, 'TBD');
              db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, reply, 'outbound');
            }

            this.io.emit(`message-${userId}`, { from, text, pushName });
          }
        }
      }
    });
  }

  private async sendMenu(sock: WASocket, from: string, menuId: number, userId: number) {
    const menu: any = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId);
    if (!menu) {
      console.log(`[WA] Menu ${menuId} not found`);
      return;
    }

    const options: any[] = db.prepare('SELECT * FROM menu_options WHERE menu_id = ? ORDER BY order_index ASC').all(menuId);

    let message = `*${menu.name}*\n\n${menu.welcome_text}\n\n`;
    if (options.length > 0) {
      options.forEach(opt => {
        message += `${opt.trigger_number}️⃣ ${opt.label}\n`;
      });
    } else {
      message += "_No options available for this menu._";
    }

    await sock.sendMessage(from, { text: message });
    db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, message, 'outbound');
    db.prepare('UPDATE user_sessions SET current_menu_id = ?, last_interaction = CURRENT_TIMESTAMP WHERE phone = ? AND user_id = ?').run(menuId, from, userId);
  }

  private async handleMenuAction(sock: WASocket, from: string, option: any, userId: number) {
    switch (option.action_type) {
      case 'text':
      case 'info':
        await sock.sendMessage(from, { text: option.reply_text });
        db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, option.reply_text, 'outbound');
        break;
      case 'booking':
        const bookingMsg = "Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday";
        await sock.sendMessage(from, { text: bookingMsg });
        db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, bookingMsg, 'outbound');
        db.prepare('UPDATE user_sessions SET current_menu_id = NULL WHERE phone = ? AND user_id = ?').run(from, userId); // Exit menu for booking flow
        break;
      case 'submenu':
        if (option.next_menu_id) {
          await this.sendMenu(sock, from, option.next_menu_id, userId);
        }
        break;
      case 'support':
        const supportMsg = "Transferring you to a human agent. Please wait...";
        await sock.sendMessage(from, { text: supportMsg });
        db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(userId, from, supportMsg, 'outbound');
        db.prepare('UPDATE user_sessions SET current_menu_id = NULL WHERE phone = ? AND user_id = ?').run(from, userId);
        break;
    }
  }

  public async sendMessage(userId: number, phone: string, content: string) {
    const sock = this.sessions.get(userId);
    if (sock) {
      const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: content });
      return true;
    }
    return false;
  }

  public getStatus(userId: number) {
    return this.sessions.has(userId) ? 'connected' : 'disconnected';
  }
}
