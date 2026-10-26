import mongoose from 'mongoose';
import User from '../models/User.js';
import InvestmentProject from '../models/InvestmentProject.js';
import InvestorInterest from '../models/InvestorInterest.js';
import { wilayaRegex } from '../utils/searchRegex.js';

// Fields of a project shown in the investor's lists (cards)
const CARD = 'title translations sourceLang reference kind assetType projectType partnership wilaya city area budget budgetMin areaMax images interestsCount status owner createdAt';

/** Approved projects that fit the investor's preferences (all approved projects when none are set). */
const matchFilter = (user) => {
  const prefs = user.investorPrefs || {};
  const filter = { status: 'approved', kind: { $ne: 'capital' }, owner: { $ne: user._id } };
  if (prefs.wilayas?.length) filter.wilaya = { $in: prefs.wilayas.map(wilayaRegex) };
  if (prefs.assetTypes?.length) filter.assetType = { $in: prefs.assetTypes };
  if (prefs.projectTypes?.length) filter.projectType = { $in: prefs.projectTypes };
  // 0 = budget to be defined: such projects always match
  if (prefs.maxBudget > 0) filter.budget = { $lte: prefs.maxBudget };
  return filter;
};

const myRequests = (userId, limit) =>
  InvestorInterest.find({ investor: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: 'project', select: CARD, populate: { path: 'owner', select: 'fullName avatar' } })
    .lean();

// GET /investor/dashboard — counters, latest requests, saved projects and matching projects
export const getDashboard = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('savedProjects investorPrefs').lean();
    const filter = matchFilter(me);
    const [requests, totalRequests, seenRequests, saved, matches, totalMatches] = await Promise.all([
      myRequests(me._id, 5),
      InvestorInterest.countDocuments({ investor: me._id }),
      InvestorInterest.countDocuments({ investor: me._id, seen: true }),
      InvestmentProject.find({ _id: { $in: me.savedProjects || [] }, status: 'approved' }).select(CARD).populate('owner', 'fullName avatar').lean(),
      InvestmentProject.find(filter).sort({ createdAt: -1 }).limit(6).select(CARD).populate('owner', 'fullName avatar').lean(),
      InvestmentProject.countDocuments(filter),
    ]);
    res.json({
      success: true,
      stats: { requests: totalRequests, seenRequests, saved: saved.length, matches: totalMatches },
      requests: requests.filter((r) => r.project),
      saved,
      matches,
      prefs: me.investorPrefs || {},
    });
  } catch (err) {
    next(err);
  }
};

// GET /investor/requests — every request this investor sent (deleted projects are dropped)
export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await myRequests(req.user._id, 200);
    res.json({ success: true, requests: requests.filter((r) => r.project) });
  } catch (err) {
    next(err);
  }
};

// GET /investor/saved — saved projects that are still published
export const getSaved = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('savedProjects').lean();
    const projects = await InvestmentProject.find({ _id: { $in: me.savedProjects || [] }, status: 'approved' })
      .select(CARD)
      .populate('owner', 'fullName avatar')
      .lean();
    res.json({ success: true, projects, ids: (me.savedProjects || []).map(String) });
  } catch (err) {
    next(err);
  }
};

// POST /investor/saved/:id — save a published project
export const saveProject = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !(await InvestmentProject.exists({ _id: req.params.id, status: 'approved' }))) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    await User.updateOne({ _id: req.user._id }, { $addToSet: { savedProjects: req.params.id } });
    res.json({ success: true, saved: true });
  } catch (err) {
    next(err);
  }
};

// DELETE /investor/saved/:id
export const unsaveProject = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Project not found' });
    await User.updateOne({ _id: req.user._id }, { $pull: { savedProjects: req.params.id } });
    res.json({ success: true, saved: false });
  } catch (err) {
    next(err);
  }
};

// PUT /investor/preferences — what the investor is looking for (used for "projects for you")
export const updatePreferences = async (req, res, next) => {
  try {
    const { wilayas = [], assetTypes = [], projectTypes = [], maxBudget = 0 } = req.body;
    const prefs = { wilayas, assetTypes, projectTypes, maxBudget: Number(maxBudget) || 0 };
    await User.updateOne({ _id: req.user._id }, { $set: { investorPrefs: prefs } });
    res.json({ success: true, prefs });
  } catch (err) {
    next(err);
  }
};
