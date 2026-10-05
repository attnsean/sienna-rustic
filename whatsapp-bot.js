const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Parse .env.local manually
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf-8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'f93ad18d-cba2-4de0-a86b-b1fadf2783a2';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials. Make sure .env.local is present.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

let client = null;
let clientReady = false;
let isInitializing = false;
let chatSyncChannel = null;

function formatPhone(phone) {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) {
    clean = '628' + clean.slice(2);
  }
  return clean;
}

function withTimeout(promise, timeoutMs, defaultValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(defaultValue), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

async function safeGetChats(client, limit = 100) {
  if (!client || !client.pupPage) return [];
  try {
    const rawChats = await client.pupPage.evaluate(() => {
      if (!window.require) return [];
      try {
        const ChatCollection = window.require('WAWebCollections').Chat;
        if (!ChatCollection) return [];
        return ChatCollection.getModelsArray().map(c => {
          let lastMessageText = '';
          try {
            if (c.lastReceivedKey) {
              const msg = window.require('WAWebCollections').Msg.get(c.lastReceivedKey._serialized);
              if (msg) {
                lastMessageText = msg.body || '';
              }
            }
          } catch (e) {}
          return {
            id: c.id._serialized,
            name: c.name || c.formattedTitle || '',
            unreadCount: c.unreadCount || 0,
            timestamp: c.t || c.timestamp || 0,
            isGroup: c.isGroup || false,
            lastMessage: lastMessageText
          };
        });
      } catch (err) {
        return [];
      }
    });

    // Fetch profile pictures in parallel with a 2-second timeout each to prevent hangs
    const formattedChats = await Promise.all(rawChats.slice(0, limit).map(async (chat) => {
      let picUrl = '';
      try {
        picUrl = await withTimeout(client.getProfilePicUrl(chat.id), 2000, '');
      } catch (e) {}
      return {
        id: chat.id,
        name: chat.name,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp,
        lastMessage: chat.lastMessage,
        isGroup: chat.isGroup,
        profilePicUrl: picUrl || ''
      };
    }));

    return formattedChats;
  } catch (err) {
    console.error("Error in safeGetChats:", err.message);
    return [];
  }
}

async function updateBotState(state) {
  console.log(`Updating DB Bot State to: ${state.status}`);
  const { error } = await supabase
    .from('projects')
    .update({ love_story: JSON.stringify({ ...state, updatedAt: new Date().toISOString() }) })
    .eq('id', projectId);

  if (error) {
    console.error("Error updating project bot state:", error.message);
  }
}

async function handleLogin() {
  if (isInitializing || (client && clientReady)) {
    console.log("Client is already initializing or connected.");
    return;
  }

  isInitializing = true;
  await updateBotState({ status: 'loading' });

  console.log("Initializing WhatsApp Web Client...");
  
  client = new Client({
    authStrategy: new LocalAuth({ clientId: projectId }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 0
    }
  });

  client.on('qr', async (qr) => {
    console.log('QR Code received. Please scan via Web Dashboard.');
    await updateBotState({ status: 'qr', qr });
  });

  client.on('ready', async () => {
    console.log('WhatsApp Web Client is ready!');
    clientReady = true;
    isInitializing = false;
    await updateBotState({ status: 'connected' });
    // Process queue immediately on start/ready
    await processQueue();
  });

  client.on('message_create', async (msg) => {
    if (!chatSyncChannel) return;
    console.log("New message created:", msg.id._serialized);
    
    // Broadcast the new message event to dashboard
    chatSyncChannel.send({
      type: 'broadcast',
      event: 'bot_new_message',
      payload: {
        chatId: msg.fromMe ? msg.to : msg.from,
        message: {
          id: msg.id._serialized,
          body: msg.body,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          type: msg.type,
          sender: msg.from,
          hasMedia: msg.hasMedia
        }
      }
    });

    // Also refresh the chat list for all clients to update the last message
    try {
      const formattedChats = await safeGetChats(client, 100);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_chats',
        payload: { success: true, chats: formattedChats }
      });
    } catch (e) {
      console.error("Error refreshing chat list after message_create:", e.message);
    }
  });

  client.on('auth_failure', async (msg) => {
    console.error('Authentication failure:', msg);
    clientReady = false;
    isInitializing = false;
    await updateBotState({ status: 'disconnected' });
  });

  client.on('disconnected', async (reason) => {
    console.log('WhatsApp Client was disconnected:', reason);
    clientReady = false;
    isInitializing = false;
    await updateBotState({ status: 'disconnected' });
    try {
      await client.destroy();
    } catch (e) {}
    client = null;
  });

  try {
    await client.initialize();
  } catch (err) {
    console.error("Error initializing client:", err);
    clientReady = false;
    isInitializing = false;
    await updateBotState({ status: 'disconnected' });
    client = null;
  }
}

async function handleLogout() {
  console.log("Logging out WhatsApp Client...");
  await updateBotState({ status: 'loading' });
  
  clientReady = false;
  
  if (client) {
    try {
      await client.logout();
      await client.destroy();
    } catch (e) {
      console.log("Error during client destroy/logout:", e.message);
    }
    client = null;
  }

  // Double check and manually remove session folder
  const sessionPath = path.join(__dirname, '.wwebjs_auth', `session-${projectId}`);
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log("Deleted session auth folder.");
    } catch (err) {
      console.error("Failed to delete session folder:", err.message);
    }
  }

  isInitializing = false;
  await updateBotState({ status: 'disconnected' });
}

async function sendBlast(row) {
  if (!clientReady || !client) {
    console.log("Client not ready, skipping message to", row.phone);
    return;
  }

  try {
    const formattedNum = formatPhone(row.phone);
    const jid = `${formattedNum}@c.us`;

    // Verify if registered
    const isRegistered = await client.isRegisteredUser(jid);
    if (!isRegistered) {
      throw new Error("Number is not registered on WhatsApp");
    }

    await client.sendMessage(jid, row.message);
    console.log(`[Success] Message sent to ${row.phone}`);

    await supabase
      .from('wa_blast_logs')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', row.id);

  } catch (err) {
    console.error(`[Failed] Message to ${row.phone} failed:`, err.message);
    await supabase
      .from('wa_blast_logs')
      .update({ status: 'failed', failed_reason: err.message })
      .eq('id', row.id);
  }
}

async function processQueue() {
  if (!clientReady || !client) return;

  const { data, error } = await supabase
    .from('wa_blast_logs')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Queue poll error:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} queued messages to process.`);
    for (const row of data) {
      await sendBlast(row);
    }
  }
}

// 1. Subscribe to Remote Commands via projects table
const commandChannel = supabase
  .channel('wa-commands')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
    async (payload) => {
      const newProj = payload.new;
      if (newProj && newProj.love_story) {
        try {
          const config = JSON.parse(newProj.love_story);
          if (config.action === 'logout') {
            await handleLogout();
          } else if (config.action === 'login') {
            await handleLogin();
          }
        } catch (e) {}
      }
    }
  )
  .subscribe();

// 2. Subscribe to Real-time Queue Influx
const queueChannel = supabase
  .channel('wa-queue')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'wa_blast_logs', filter: `project_id=eq.${projectId}` },
    async (payload) => {
      const newBlast = payload.new;
      if (newBlast && newBlast.status === 'queued') {
        console.log("Realtime queued blast triggered for", newBlast.phone);
        await sendBlast(newBlast);
      }
    }
  )
  .subscribe();

// 3. Setup Polling as Fallback every 10 seconds
setInterval(async () => {
  if (clientReady) {
    await processQueue();
  }
}, 10000);

// 4. Setup Real-time Chat Sync Broadcast Channel
chatSyncChannel = supabase.channel(`wa-chats:${projectId}`, {
  config: {
    broadcast: { self: false }
  }
});

chatSyncChannel
  .on('broadcast', { event: 'request_chats' }, async (payload) => {
    console.log("Received request_chats broadcast", payload);
    if (!clientReady || !client) {
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_chats',
        payload: { success: false, error: 'WhatsApp robot is not connected.' }
      });
      return;
    }
    try {
      const limit = (payload && payload.payload && payload.payload.limit) || 100;
      const formattedChats = await safeGetChats(client, limit);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_chats',
        payload: { success: true, chats: formattedChats }
      });
    } catch (err) {
      console.error("Error fetching chats:", err.message);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_chats',
        payload: { success: false, error: err.message }
      });
    }
  })
  .on('broadcast', { event: 'request_messages' }, async (payload) => {
    const { chatId, limit } = payload.payload;
    console.log("Received request_messages broadcast for", chatId, "limit:", limit);
    if (!clientReady || !client) {
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_messages',
        payload: { success: false, error: 'WhatsApp robot is not connected.' }
      });
      return;
    }
    try {
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: limit || 50 });
      const formattedMessages = messages.map(msg => ({
        id: msg.id._serialized,
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
        type: msg.type,
        sender: msg.from,
        hasMedia: msg.hasMedia
      }));

      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_messages',
        payload: { success: true, chatId, messages: formattedMessages }
      });
    } catch (err) {
      console.error("Error fetching messages:", err.message);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_messages',
        payload: { success: false, error: err.message }
      });
    }
  })
  .on('broadcast', { event: 'send_message' }, async (payload) => {
    const { chatId, text, limit } = payload.payload;
    console.log("Received send_message broadcast for", chatId, "limit:", limit);
    if (!clientReady || !client) return;
    try {
      await client.sendMessage(chatId, text);
      
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: limit || 50 });
      const formattedMessages = messages.map(msg => ({
        id: msg.id._serialized,
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
        type: msg.type,
        sender: msg.from,
        hasMedia: msg.hasMedia
      }));

      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_messages',
        payload: { success: true, chatId, messages: formattedMessages }
      });

      // Refresh chat list to update last message
      const formattedChats = await safeGetChats(client, 100);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_chats',
        payload: { success: true, chats: formattedChats }
      });
    } catch (err) {
      console.error("Error sending message via broadcast:", err.message);
    }
  })
  .on('broadcast', { event: 'request_media' }, async (payload) => {
    let { messageId, chatId } = payload.payload;
    console.log("Received request_media broadcast for message:", messageId, "chatId:", chatId);
    if (!clientReady || !client) return;
    try {
      if (!chatId) {
        const parts = messageId.split('_');
        chatId = parts[1];
      }
      if (!chatId) throw new Error("Invalid message ID or chat ID format");
      
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 150 });
      const msg = messages.find(m => m.id._serialized === messageId);
      
      if (!msg) throw new Error("Message not found");
      if (!msg.hasMedia) throw new Error("Message does not contain media");
      
      const media = await msg.downloadMedia();
      if (!media) throw new Error("Failed to download media");
      
      const dataUrl = `data:${media.mimetype};base64,${media.data}`;
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_media',
        payload: { 
          success: true, 
          messageId, 
          dataUrl, 
          filename: media.filename || null 
        }
      });
    } catch (err) {
      console.error("Error downloading media:", err.message);
      chatSyncChannel.send({
        type: 'broadcast',
        event: 'response_media',
        payload: { success: false, messageId, error: err.message }
      });
    }
  })
  .subscribe();

// Initialize Client on Startup
handleLogin();

console.log("WhatsApp Blaster Background Service Started!");
console.log("Waiting for database commands/events...");
