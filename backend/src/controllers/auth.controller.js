import crypto from 'crypto';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail, { emailConfigured } from '../utils/sendEmail.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { googleEnabled, verifyGoogleCredential } from '../utils/google.js';
import { uploadBuffer, destroyImage } from '../utils/cloudinaryUpload.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const RESET_MINUTES = 30;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sanitize = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  isVerified: user.isVerified,
});

const sendAuth = (res, user, status = 200) => {
  const token = generateToken(user._id);
  const isProd = process.env.NODE_ENV === 'production';
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(status)
    .json({ success: true, token, user: sanitize(user) });
};

// POST /auth/register
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ fullName, email, password, phone, role });
    sendAuth(res, user, 201);
  } catch (err) {
    next(err);
  }
};

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    sendAuth(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout
export const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  }).json({ success: true, message: 'Logged out' });
};

// PUT /auth/avatar (multipart "avatar") — profile photo of any user (guest, owner, seller, admin)
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose an image' });
    const user = await User.findById(req.user._id);
    const previous = user.avatar?.publicId;
    user.avatar = await uploadBuffer(req.file.buffer, 'dzhotels/avatars', req.file.mimetype);
    await user.save({ validateBeforeSave: false });
    if (previous) destroyImage(previous); // the old photo is no longer used
    res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// DELETE /auth/avatar — back to the initial
export const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.avatar?.publicId) destroyImage(user.avatar.publicId);
    user.avatar = { url: '', publicId: '' };
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me
export const getMe = async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
};

// PUT /auth/update-profile
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (password) user.password = password; // re-hashed by pre-save hook

    await user.save();
    // a new password revokes older tokens: hand this session a fresh one
    if (password) return sendAuth(res, user);
    res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

const button = (url, label) =>
  `<p><a href="${url}" style="display:inline-block;background:#f97316;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${label}</a></p>`;

const RESET_MAIL = {
  fr: {
    subject: 'Réinitialiser votre mot de passe — Meskan',
    html: (name, url) => `<p>Bonjour ${name},</p>
     <p>Vous avez demandé à réinitialiser le mot de passe de votre compte Meskan.</p>
     ${button(url, 'Choisir un nouveau mot de passe')}
     <p>Ce lien est valable ${RESET_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe ne change pas.</p>`,
  },
  ar: {
    subject: 'إعادة تعيين كلمة المرور — مسكن',
    html: (name, url) => `<div dir="rtl" style="text-align:right"><p>مرحبًا ${name}،</p>
     <p>لقد طلبت إعادة تعيين كلمة مرور حسابك في مسكن.</p>
     ${button(url, 'اختيار كلمة مرور جديدة')}
     <p>هذا الرابط صالح لمدة ${RESET_MINUTES} دقيقة. إذا لم تطلب ذلك، تجاهل هذه الرسالة: كلمة مرورك لن تتغير.</p></div>`,
  },
  en: {
    subject: 'Reset your password — Meskan',
    html: (name, url) => `<p>Hello ${name},</p>
     <p>You asked to reset the password of your Meskan account.</p>
     ${button(url, 'Choose a new password')}
     <p>This link is valid for ${RESET_MINUTES} minutes. If you did not ask for it, ignore this email: your password stays the same.</p>`,
  },
};

// POST /auth/forgot-password — same answer whether the account exists or not (no account discovery)
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, lang } = req.body;
    const done = { success: true, message: 'If an account exists for this email, a reset link has been sent' };
    const user = await User.findOne({ email });
    if (!user || user.isBlocked) return res.json(done);

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token); // only the hash is stored
    user.resetPasswordExpire = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const l = RESET_MAIL[lang] ? lang : 'fr';
    const url = `${CLIENT_URL}/reset-password?token=${token}&lang=${l}`;
    try {
      await sendEmail({ to: user.email, subject: RESET_MAIL[l].subject, html: RESET_MAIL[l].html(escapeHtml(user.fullName), url) });
    } catch (e) {
      console.error('Reset email failed:', e.message);
    }
    // Local development without SMTP: the link is printed and returned so the flow can be tested
    if (!emailConfigured() && process.env.NODE_ENV !== 'production') {
      console.log(`🔑 Password reset link for ${user.email}: ${url}`);
      return res.json({ ...done, devResetUrl: url });
    }
    res.json(done);
  } catch (err) {
    next(err);
  }
};

// POST /auth/reset-password — the emailed token sets a new password and logs the user in
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');
    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }
    user.password = password;
    user.resetPasswordToken = undefined; // single use
    user.resetPasswordExpire = undefined;
    await user.save(); // sets passwordChangedAt: every other session is logged out
    sendAuth(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /auth/google — "Sign in with Google": logs in, links the Google account, or creates one
export const googleAuth = async (req, res, next) => {
  try {
    if (!googleEnabled()) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured' });
    }
    let profile;
    try {
      profile = await verifyGoogleCredential(req.body.credential);
    } catch {
      profile = null;
    }
    if (!profile?.emailVerified) {
      return res.status(401).json({ success: false, message: 'Google sign-in failed' });
    }
    const { user, created } = await findOrCreateGoogleUser(profile, req.body.role);
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }
    sendAuth(res, user, created ? 201 : 200);
  } catch (err) {
    next(err);
  }
};

/** Account of a verified Google profile: by Google id, else by email (then linked), else a new one. */
export async function findOrCreateGoogleUser(profile, role = 'customer') {
  let user = await User.findOne({ googleId: profile.googleId });
  if (user) return { user, created: false };

  user = await User.findOne({ email: profile.email });
  if (user) {
    user.googleId = profile.googleId;
    user.isVerified = true;
    if (!user.avatar?.url && profile.picture) user.avatar = { url: profile.picture, publicId: '' };
    await user.save({ validateBeforeSave: false });
    return { user, created: false };
  }

  user = await User.create({
    fullName: profile.fullName.slice(0, 80),
    email: profile.email,
    // random password: the user can set one later with "forgot password"
    password: crypto.randomBytes(24).toString('hex'),
    role: ['customer', 'owner', 'seller', 'investor'].includes(role) ? role : 'customer',
    googleId: profile.googleId,
    isVerified: true,
    avatar: { url: profile.picture || '', publicId: '' },
  });
  return { user, created: true };
}

// PUT /auth/space — switch the account to another space (traveller, host, seller, investor).
// Everyone signs up as a traveller and may move freely between spaces; listings stay attached to the account.
export const switchSpace = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ success: false, message: 'Admins keep their role' });
    const user = await User.findByIdAndUpdate(req.user._id, { role: req.body.role }, { new: true });
    res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};
