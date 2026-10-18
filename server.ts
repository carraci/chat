import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'chat_database.json');

// Types
export interface ChatMessage {
  id: number;
  sender: 'user' | 'bot' | 'system';
  text: string;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  timestamp: string;
  edited?: boolean;
  edited_at?: string | null;
  mode?: 'gemini' | 'auto-responder' | 'echo';
}

// In-file persistent DB functions
function readMessages(): ChatMessage[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: ChatMessage[] = [
        {
          id: 1,
          sender: 'bot',
          text: "Hello! I am your Smart Assistant. You can chat with me, upload images, documents, or PDFs, edit past messages, and switch between Gemini AI and the built-in auto-responder.",
          file_name: null,
          file_url: null,
          file_type: null,
          file_size: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          edited: false,
          mode: 'gemini'
        }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as ChatMessage[];
  } catch (err) {
    console.error('Error reading chat database:', err);
    return [];
  }
}

function writeMessages(messages: ChatMessage[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing chat database:', err);
  }
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename and preserve extension
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e5);
    cb(null, `${uniquePrefix}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })
  : null;

// Smart built-in auto-responder logic
function generateAutoReply(userMessage: string, filename?: string | null): string {
  const msg = (userMessage || '').toLowerCase().trim();

  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')) {
      return `I received your image '${filename}'. It looks great! Ask me any question about this image or how you'd like to use it.`;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'csv', 'json', 'md'].includes(ext || '')) {
      return `I've successfully received and stored your document '${filename}'. Would you like a summary, key insights, or data extraction?`;
    }
    return `I received your attached file '${filename}'. How would you like me to process or summarize it?`;
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return "Hello! How can I assist you today? You can ask questions, send notes, or upload media files.";
  }
  if (msg.includes('help') || msg.includes('what can you do')) {
    return "Here is what I can do:\n- 💬 Converse with you in real-time\n- 📎 Accept images, PDFs, text, and docs\n- ✏️ Let you edit previously sent messages\n- 🗑️ Delete specific messages or clear all history\n- 🤖 Switch between Gemini AI and built-in Auto-Responder";
  }
  if (msg.includes('time') || msg.includes('date')) {
    return `Current server time is ${new Date().toLocaleString()}.`;
  }
  if (msg.includes('who are you')) {
    return "I am your Full-Stack Smart Assistant Chatbot, powered by Express, React, Tailwind CSS, and Google Gemini.";
  }

  return `Echo & Auto-Response: You said "${userMessage}". Feel free to ask another question or attach a file!`;
}

// ----------------- API ROUTES ----------------- //

// 0. System status & config
app.get('/api/status', (_req: Request, res: Response) => {
  const messages = readMessages();
  res.json({
    status: 'online',
    hasGeminiKey: Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY'),
    recommendedModel: 'gemini-3.8-flash',
    totalMessages: messages.length,
    timestamp: new Date().toISOString()
  });
});

// 1. Fetch History
app.get('/api/messages', (_req: Request, res: Response) => {
  try {
    const messages = readMessages();
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve messages', details: err.message });
  }
});

// 2. Send Message & Upload Files with Gemini / Auto-responder
app.post('/api/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userText = (req.body.text || '').trim();
    const mode = (req.body.mode || 'gemini') as 'gemini' | 'auto-responder' | 'echo';
    const file = req.file;

    if (!userText && !file) {
      return res.status(400).json({ error: 'Message cannot be empty without an attached file' });
    }

    const messages = readMessages();
    const nextId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;

    let fileName: string | null = null;
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      fileName = file.originalname;
      fileUrl = `/uploads/${file.filename}`;
      fileType = file.mimetype;
      fileSize = file.size;
    }

    const userMessage: ChatMessage = {
      id: nextId,
      sender: 'user',
      text: userText,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType,
      file_size: fileSize,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      edited: false,
      mode
    };

    messages.push(userMessage);

    // Bot response generation
    let botReply = '';

    if (mode === 'echo') {
      botReply = `[Echo Mode] You sent: "${userText || '(No text)'}"${fileName ? ` with attached file '${fileName}' (${fileType})` : ''}`;
    } else if (mode === 'auto-responder' || !ai || !geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
      // Use built-in auto responder
      botReply = generateAutoReply(userText, fileName);
    } else {
      // Use Google Gemini via @google/genai
      try {
        const parts: any[] = [];

        // If file uploaded, attach multimodal inline data or document contents
        if (file) {
          const filePath = file.path;
          const mimeType = file.mimetype;

          // Check if image or pdf for inlineData
          if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString('base64');
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          } else if (
            mimeType.startsWith('text/') ||
            mimeType === 'application/json' ||
            file.originalname.match(/\.(txt|md|csv|json|js|ts|py|html|css|xml)$/i)
          ) {
            // Textual document, read snippet
            try {
              const textContent = fs.readFileSync(filePath, 'utf-8').slice(0, 40000); // 40k chars max
              parts.push({
                text: `[Attached file: "${file.originalname}" (${mimeType})]\n--- File Content ---\n${textContent}\n--- End of File Content ---`
              });
            } catch {
              parts.push({
                text: `[Attached file: "${file.originalname}" (${mimeType})]`
              });
            }
          } else {
            parts.push({
              text: `[Attached file: "${file.originalname}" (${mimeType}, size: ${Math.round(file.size / 1024)} KB)]`
            });
          }
        }

        const promptText = userText || (file ? `Please analyze and summarize the attached file "${fileName}".` : 'Hello!');
        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            systemInstruction: 'You are a smart, helpful, concise, and friendly AI chatbot assistant. When the user attaches files or images, inspect them thoroughly and give clear, well-structured answers using markdown when appropriate.'
          }
        });

        // Error handling for empty response
        const candidateText = response.text ? response.text.trim() : '';
        if (!candidateText) {
          botReply = "I received and processed your input, but no text response was returned by the model. Please feel free to ask again or clarify your question.";
        } else {
          botReply = candidateText;
        }
      } catch (geminiError: any) {
        console.error('Gemini generation error:', geminiError);
        // Fallback gracefully to auto-reply with error notice
        const fallback = generateAutoReply(userText, fileName);
        botReply = `*(Note: Gemini connection issue: ${geminiError?.message || 'Check API key'}. Providing automatic fallback:)*\n\n${fallback}`;
      }
    }

    // Ensure botReply is not empty under any circumstance
    if (!botReply || botReply.trim() === '') {
      botReply = "I processed your request, but could not produce a response. Please try rephrasing your message.";
    }

    const botMessage: ChatMessage = {
      id: nextId + 1,
      sender: 'bot',
      text: botReply,
      file_name: null,
      file_url: null,
      file_type: null,
      file_size: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      edited: false,
      mode
    };

    messages.push(botMessage);
    writeMessages(messages);

    res.json({
      status: 'success',
      reply: botReply,
      user_message: userMessage,
      bot_message: botMessage
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: 'Server error processing chat message', details: err.message });
  }
});

// 3. Update / Edit Message
app.put('/api/messages/:id', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id, 10);
    const newText = (req.body.text || '').trim();
    const shouldRegenerate = Boolean(req.body.regenerate);

    if (!newText) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const messages = readMessages();
    const targetIdx = messages.findIndex(m => m.id === msgId);

    if (targetIdx === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    messages[targetIdx].text = newText;
    messages[targetIdx].edited = true;
    messages[targetIdx].edited_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let regeneratedBotMessage: ChatMessage | null = null;

    // If it's a user message and regeneration was requested:
    if (messages[targetIdx].sender === 'user' && shouldRegenerate) {
      let botReply = '';
      const mode = messages[targetIdx].mode || 'gemini';

      if (mode === 'echo') {
        botReply = `[Echo Mode] You updated your message to: "${newText}"`;
      } else if (mode === 'auto-responder' || !ai || !geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
        botReply = generateAutoReply(newText, messages[targetIdx].file_name);
      } else {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: newText,
            config: {
              systemInstruction: 'You are a smart, helpful AI chatbot assistant. Provide a clear and helpful response to the edited user prompt.'
            }
          });
          botReply = response.text?.trim() || "I processed your updated request, but no response was generated. Please try again.";
        } catch (e: any) {
          botReply = `*(Gemini error: ${e.message})* Fallback: ${generateAutoReply(newText)}`;
        }
      }

      if (!botReply || botReply.trim() === '') {
        botReply = "I received your updated message, but could not produce a response.";
      }

      // Check if there is an immediate subsequent bot message
      if (targetIdx + 1 < messages.length && messages[targetIdx + 1].sender === 'bot') {
        messages[targetIdx + 1].text = botReply;
        messages[targetIdx + 1].edited = true;
        messages[targetIdx + 1].edited_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        regeneratedBotMessage = messages[targetIdx + 1];
      } else {
        // Create new bot message
        const nextId = Math.max(...messages.map(m => m.id)) + 1;
        const newBot: ChatMessage = {
          id: nextId,
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          edited: false,
          mode
        };
        messages.push(newBot);
        regeneratedBotMessage = newBot;
      }
    }

    writeMessages(messages);
    res.json({
      status: 'updated',
      message: messages[targetIdx],
      regeneratedBotMessage
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update message', details: err.message });
  }
});

// 4. Clear Entire Chat History (must be before /:id)
app.delete('/api/messages/clear', (_req: Request, res: Response) => {
  try {
    writeMessages([]);
    res.json({ status: 'all_cleared', message: 'All chat history cleared' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear history', details: err.message });
  }
});

// 5. Delete Single Message
app.delete('/api/messages/:id', (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id, 10);
    if (isNaN(msgId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    const messages = readMessages();
    const updated = messages.filter(m => m.id !== msgId);

    if (updated.length === messages.length) {
      return res.status(404).json({ error: 'Message not found' });
    }

    writeMessages(updated);
    res.json({ status: 'deleted', id: msgId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete message', details: err.message });
  }
});

// ----------------- VITE / STATIC SERVING ----------------- //

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Assistant Chatbot server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
