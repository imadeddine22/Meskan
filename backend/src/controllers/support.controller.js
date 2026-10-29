import mongoose from 'mongoose';
import SupportThread from '../models/SupportThread.js';
import User from '../models/User.js';

const MAX = 2000;
const cleanText = (v) => String(v || '').trim();
const cleanAbout = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 200);
const tooLong = (res) => res.status(400).json({ success: false, message: 'Message is too long (2000 characters max)' });
const empty = (res) => res.status(400).json({ success: false, message: 'Message cannot be empty' });

/** Mark one side's messages as read. Returns true when something changed. */
const markRead = (thread, fromAdmin) => {
  let changed = false;
  for (const m of thread.messages) {
    if (!m.readAt && Boolean(m.fromAdmin) === fromAdmin) {
      m.readAt = new Date();
      changed = true;
    }
  }
  return changed;
};

// ── User side: one conversation with Meskan ─────────────────────

// GET /support/thread — my conversation with Meskan (empty until the first message); marks Meskan's replies as read
export const getMyThread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ user: req.user._id });
    if (thread && markRead(thread, true)) await thread.save();
    res.json({ success: true, thread: thread || { messages: [] } });
  } catch (err) {
    next(err);
  }
};

// GET /support/unread — Meskan's replies I haven't read (navbar badge)
export const getMyUnread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ user: req.user._id }).select('messages.fromAdmin messages.readAt');
    res.json({ success: true, unread: thread ? thread.unreadFor('user') : 0 });
  } catch (err) {
    next(err);
  }
};

// POST /support/thread/messages { text, about? } — write to Meskan
export const sendToMeskan = async (req, res, next) => {
  try {
    const text = cleanText(req.body?.text);
    if (!text) return empty(res);
    if (text.length > MAX) return tooLong(res);
    const message = { fromAdmin: false, sender: req.user._id, text, about: cleanAbout(req.body?.about) };
    const thread = await SupportThread.findOneAndUpdate(
      { user: req.user._id },
      { $push: { messages: message }, $set: { lastMessageAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, message: thread.messages[thread.messages.length - 1] });
  } catch (err) {
    next(err);
  }
};

// ── Admin side (Meskan) ─────────────────────────────────────────

// GET /admin/support — every conversation, newest first, with the user's contact
export const listThreads = async (req, res, next) => {
  try {
    const threads = await SupportThread.find().sort({ lastMessageAt: -1 }).limit(300).populate('user', 'fullName email phone role avatar');
    const list = threads.map((t) => {
      const last = t.messages[t.messages.length - 1];
      return {
        _id: t._id,
        user: t.user,
        lastMessage: last ? { text: last.text.slice(0, 140), fromAdmin: last.fromAdmin, about: last.about, createdAt: last.createdAt } : null,
        lastMessageAt: t.lastMessageAt,
        unread: t.unreadFor('admin'),
      };
    });
    res.json({ success: true, unread: list.reduce((n, t) => n + t.unread, 0), threads: list });
  } catch (err) {
    next(err);
  }
};

// GET /admin/support/unread — users' messages not read yet by Meskan (admin badge)
export const adminUnread = async (req, res, next) => {
  try {
    const threads = await SupportThread.find({ messages: { $elemMatch: { fromAdmin: false, readAt: null } } }).select('messages.fromAdmin messages.readAt');
    res.json({ success: true, unread: threads.reduce((n, t) => n + t.unreadFor('admin'), 0) });
  } catch (err) {
    next(err);
  }
};

// GET /admin/support/:id — one conversation; marks the user's messages as read
export const getThread = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const thread = await SupportThread.findById(req.params.id).populate('user', 'fullName email phone role avatar');
    if (!thread) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (markRead(thread, false)) await thread.save();
    res.json({ success: true, thread });
  } catch (err) {
    next(err);
  }
};

// POST /admin/support/user/:userId/messages { text } — Meskan writes to a user (starts the conversation if needed)
export const replyToUser = async (req, res, next) => {
  try {
    const text = cleanText(req.body?.text);
    if (!text) return empty(res);
    if (text.length > MAX) return tooLong(res);
    if (!mongoose.isValidObjectId(req.params.userId) || !(await User.exists({ _id: req.params.userId }))) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const thread = await SupportThread.findOneAndUpdate(
      { user: req.params.userId },
      { $push: { messages: { fromAdmin: true, sender: req.user._id, text } }, $set: { lastMessageAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, threadId: thread._id, message: thread.messages[thread.messages.length - 1] });
  } catch (err) {
    next(err);
  }
};
