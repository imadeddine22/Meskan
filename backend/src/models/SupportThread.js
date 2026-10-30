import mongoose from 'mongoose';

/**
 * Messages between one user and Meskan (the site's administration). Meskan is the intermediary between
 * guests and owners, buyers and sellers, investors and project owners: users never write to each other,
 * only to Meskan. One thread per user.
 */
const supportMessageSchema = new mongoose.Schema(
  {
    fromAdmin: { type: Boolean, default: false },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    // what the message is about, when sent from a listing or a booking ("Réservation BK-… — Hôtel X")
    about: { type: String, trim: true, maxlength: 200, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportThreadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [supportMessageSchema],
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

/** Unread messages for the user (sent by Meskan) or for the admins (sent by the user). */
supportThreadSchema.methods.unreadFor = function (side) {
  const fromAdmin = side === 'user';
  return this.messages.filter((m) => !m.readAt && Boolean(m.fromAdmin) === fromAdmin).length;
};

export default mongoose.model('SupportThread', supportThreadSchema);
