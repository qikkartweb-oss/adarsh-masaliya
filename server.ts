import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import db from './src/lib/db.ts';
import { WhatsAppManager } from './src/lib/whatsapp.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  const waManager = new WhatsAppManager(io);

  app.use(cors());
  app.use(express.json());

  // Auth Middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number, email: string };
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Auth Routes
  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email } });
    } catch (e: any) {
      res.status(400).json({ message: 'Email already exists' });
    }
  }));

  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }));

  // Chatbot Rules
  app.get('/api/rules', authMiddleware, (req: any, res) => {
    const rules = db.prepare('SELECT * FROM chatbot_rules WHERE user_id = ?').all(req.user.id);
    res.json(rules);
  });

  app.post('/api/rules', authMiddleware, (req: any, res) => {
    const { keyword, reply, type } = req.body;
    const result = db.prepare('INSERT INTO chatbot_rules (user_id, keyword, reply, type) VALUES (?, ?, ?, ?)').run(req.user.id, keyword, reply, type || 'keyword');
    res.json({ id: result.lastInsertRowid, keyword, reply, type });
  });

  app.delete('/api/rules/:id', authMiddleware, (req: any, res) => {
    db.prepare('DELETE FROM chatbot_rules WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Bookings
  app.get('/api/bookings', authMiddleware, (req: any, res) => {
    const bookings = db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(bookings);
  });

  // Messages / Team Inbox
  app.get('/api/messages', authMiddleware, (req: any, res) => {
    const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100').all(req.user.id);
    res.json(messages);
  });

  app.post('/api/messages/send', authMiddleware, asyncHandler(async (req: any, res) => {
    const { phone, content } = req.body;
    const success = await waManager.sendMessage(req.user.id, phone, content);
    if (success) {
      db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(req.user.id, phone, content, 'outbound');
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'WhatsApp not connected' });
    }
  }));

  // Broadcast
  app.post('/api/broadcast', authMiddleware, asyncHandler(async (req: any, res) => {
    const { content, phones } = req.body;
    for (const phone of phones) {
      await waManager.sendMessage(req.user.id, phone, content);
      db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(req.user.id, phone, content, 'outbound');
    }
    res.json({ success: true });
  }));

  // Contacts
  app.get('/api/contacts', authMiddleware, (req: any, res) => {
    const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(req.user.id);
    res.json(contacts);
  });

  // WhatsApp Connection Status
  app.get('/api/whatsapp/status', authMiddleware, (req: any, res) => {
    const status = waManager.getStatus(req.user.id);
    res.json({ status });
  });

  app.post('/api/whatsapp/connect', authMiddleware, (req: any, res) => {
    waManager.initSession(req.user.id);
    res.json({ success: true });
  });

  // Menu Chatbot Endpoints
  app.get('/api/menus', authMiddleware, (req: any, res) => {
    const menus = db.prepare('SELECT * FROM menus WHERE user_id = ?').all(req.user.id);
    res.json(menus);
  });

  app.post('/api/menus', authMiddleware, (req: any, res) => {
    const { name, welcome_text, is_main, enabled } = req.body;
    if (is_main) {
      db.prepare('UPDATE menus SET is_main = 0 WHERE user_id = ?').run(req.user.id);
    }
    const result = db.prepare('INSERT INTO menus (user_id, name, welcome_text, is_main, enabled) VALUES (?, ?, ?, ?, ?)').run(req.user.id, name, welcome_text, is_main ? 1 : 0, enabled ? 1 : 0);
    res.json({ id: result.lastInsertRowid, name, welcome_text, is_main, enabled });
  });

  app.put('/api/menus/:id', authMiddleware, (req: any, res) => {
    const { name, welcome_text, is_main, enabled } = req.body;
    if (is_main) {
      db.prepare('UPDATE menus SET is_main = 0 WHERE user_id = ?').run(req.user.id);
    }
    db.prepare('UPDATE menus SET name = ?, welcome_text = ?, is_main = ?, enabled = ? WHERE id = ? AND user_id = ?')
      .run(name, welcome_text, is_main ? 1 : 0, enabled ? 1 : 0, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete('/api/menus/:id', authMiddleware, (req: any, res) => {
    db.prepare('DELETE FROM menu_options WHERE menu_id = ?').run(req.params.id);
    db.prepare('DELETE FROM menus WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.get('/api/menus/:id/options', authMiddleware, (req: any, res) => {
    const options = db.prepare('SELECT * FROM menu_options WHERE menu_id = ? ORDER BY order_index ASC').all(req.params.id);
    res.json(options);
  });

  app.post('/api/menus/:id/options', authMiddleware, (req: any, res) => {
    const { trigger_number, label, reply_text, action_type, next_menu_id } = req.body;
    
    // Get max order_index to append to the end
    const maxOrder = db.prepare('SELECT MAX(order_index) as max_order FROM menu_options WHERE menu_id = ?').get(req.params.id) as any;
    const nextOrder = (maxOrder?.max_order ?? -1) + 1;

    const result = db.prepare('INSERT INTO menu_options (menu_id, trigger_number, label, reply_text, action_type, next_menu_id, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.params.id, trigger_number, label, reply_text, action_type, next_menu_id, nextOrder);
    res.json({ id: result.lastInsertRowid, trigger_number, label, reply_text, action_type, next_menu_id, order_index: nextOrder });
  });

  app.put('/api/options/:id', authMiddleware, (req: any, res) => {
    const { trigger_number, label, reply_text, action_type, next_menu_id, order_index } = req.body;
    db.prepare('UPDATE menu_options SET trigger_number = ?, label = ?, reply_text = ?, action_type = ?, next_menu_id = ?, order_index = ? WHERE id = ?')
      .run(trigger_number, label, reply_text, action_type, next_menu_id, order_index, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/options/:id', authMiddleware, (req: any, res) => {
    db.prepare('DELETE FROM menu_options WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/menus/:id/reorder', authMiddleware, (req: any, res) => {
    const { options } = req.body;
    const update = db.prepare('UPDATE menu_options SET order_index = ? WHERE id = ?');
    const transaction = db.transaction((opts) => {
      for (let i = 0; i < opts.length; i++) {
        update.run(i, opts[i].id);
      }
    });
    transaction(options);
    res.json({ success: true });
  });

  // Campaigns / Broadcasts
  app.get('/api/campaigns', authMiddleware, (req: any, res) => {
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(campaigns);
  });

  app.post('/api/campaigns', authMiddleware, (req: any, res) => {
    const { name, content } = req.body;
    const result = db.prepare('INSERT INTO campaigns (user_id, name, content) VALUES (?, ?, ?)').run(req.user.id, name, content);
    res.json({ id: result.lastInsertRowid, name, content, status: 'pending', sent_count: 0 });
  });

  app.post('/api/campaigns/:id/send', authMiddleware, asyncHandler(async (req: any, res: any) => {
    const campaign: any = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const { phones } = req.body;
    const targetPhones = phones && Array.isArray(phones) ? phones : db.prepare('SELECT phone FROM contacts WHERE user_id = ?').all(req.user.id).map((c: any) => c.phone);
    
    let sentCount = 0;
    
    for (const phone of targetPhones) {
      const success = await waManager.sendMessage(req.user.id, phone, campaign.content);
      if (success) {
        sentCount++;
        db.prepare('INSERT INTO messages (user_id, phone, content, direction) VALUES (?, ?, ?, ?)').run(req.user.id, phone, campaign.content, 'outbound');
      }
      // Small delay to avoid spam detection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    db.prepare('UPDATE campaigns SET status = ?, sent_count = ? WHERE id = ?').run('sent', sentCount, req.params.id);
    res.json({ success: true, sentCount });
  }));

  app.delete('/api/campaigns/:id', authMiddleware, (req: any, res) => {
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Contacts
  app.get('/api/contacts', authMiddleware, (req: any, res) => {
    const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
    res.json(contacts);
  });

  app.delete('/api/contacts/:id', authMiddleware, (req: any, res) => {
    db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Stats
  app.get('/api/stats', authMiddleware, (req: any, res) => {
    const rulesCount = (db.prepare('SELECT COUNT(*) as count FROM chatbot_rules WHERE user_id = ?').get(req.user.id) as any).count;
    const bookingsCount = (db.prepare('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?').get(req.user.id) as any).count;
    const messagesCount = (db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ?').get(req.user.id) as any).count;
    const contactsCount = (db.prepare('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?').get(req.user.id) as any).count;
    const campaignsCount = (db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?').get(req.user.id) as any).count;
    
    res.json({
      rules: rulesCount,
      bookings: bookingsCount,
      messages: messagesCount,
      contacts: contactsCount,
      campaigns: campaignsCount
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
