import mongoose from 'mongoose';
import InvestmentProject, { ASSET_TYPES, PROJECT_TYPES, PARTNERSHIP_TYPES, NO_DOCUMENT } from '../models/InvestmentProject.js';
import InvestorInterest from '../models/InvestorInterest.js';
import { uploadMany, destroyImage } from '../utils/cloudinaryUpload.js';
import { parseCoordinates } from '../utils/parseCoordinates.js';
import { paging, num } from '../utils/query.js';
import { searchRegex, wilayaRegex } from '../utils/searchRegex.js';
import { canView } from '../middlewares/auth.middleware.js';
import { sendEmail } from '../utils/sendEmail.js';
import { escapeHtml } from '../utils/escapeHtml.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Fields the property owner may set. Status, views, reference and counters are server-controlled.
const EDITABLE = ['title', 'description', 'assetType', 'assetOther', 'projectType', 'partnership', 'country', 'wilaya', 'city', 'address', 'area', 'areaMax', 'landDocument', 'documentOther', 'budget', 'budgetMin', 'ownerShare', 'contactPhone', 'contactEmail'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined && body[k] !== '').map((k) => [k, body[k]]));
const isOwner = (req, p) => String(p.owner?._id || p.owner) === String(req.user?._id);
const MAX_DOCUMENTS = 2;
const photosOf = (req) => req.files?.images || [];
const documentsOf = (req) => req.files?.documents || [];
/** JSON list of public ids kept by the edit form; undefined when the form didn't send it. */
const keptIds = (raw) => {
  if (raw === undefined) return undefined;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
const notify = (to, subject, html) => to && sendEmail({ to, subject, html }).catch((e) => console.error('Email failed:', e.message));

// GET /projects?kind=asset|capital&wilaya=&assetType=&projectType=&partnership=&minArea=&maxArea=&q=&sort=newest|area|budget&page=
export const getProjects = async (req, res, next) => {
  try {
    // kind=capital: investors' searches; anything else: properties (older listings have no kind)
    const filter = { status: 'approved', kind: req.query.kind === 'capital' ? 'capital' : { $ne: 'capital' } };
    const { wilaya, assetType, projectType, partnership, q, sort } = req.query;
    if (typeof wilaya === 'string' && wilaya) filter.wilaya = wilayaRegex(wilaya);
    if (ASSET_TYPES.includes(assetType)) filter.assetType = assetType;
    if (PROJECT_TYPES.includes(projectType)) filter.projectType = projectType;
    if (PARTNERSHIP_TYPES.includes(partnership)) filter.partnership = partnership;
    const minArea = num(req.query.minArea);
    const maxArea = num(req.query.maxArea);
    if (minArea || maxArea) filter.area = { ...(minArea && { $gte: minArea }), ...(maxArea && { $lte: maxArea }) };
    if (typeof q === 'string' && q.trim()) {
      const rx = searchRegex(q);
      filter.$or = [{ title: rx }, { description: rx }, { city: rx }, { reference: rx }];
    }
    const order = sort === 'area' ? { area: -1 } : sort === 'budget' ? { budget: -1 } : { createdAt: -1 };
    const { page, limit, skip } = paging(req.query, { def: 12, max: 50 });
    const [projects, total] = await Promise.all([
      InvestmentProject.find(filter).sort(order).skip(skip).limit(limit).populate('owner', 'fullName avatar').lean(),
      InvestmentProject.countDocuments(filter),
    ]);
    res.json({ success: true, total, page, pages: Math.ceil(total / limit) || 1, projects });
  } catch (err) {
    next(err);
  }
};

// GET /projects/:id — public once approved; the owner and admins also see it before
export const getProject = async (req, res, next) => {
  try {
    const project = await InvestmentProject.findById(req.params.id).populate('owner', 'fullName avatar createdAt');
    if (!project || !canView(req, project)) return res.status(404).json({ success: false, message: 'Project not found' });
    const privileged = req.user && (req.user.role === 'admin' || isOwner(req, project));
    // ?noview=1: the server-side render of the page, so a visit is only counted once (by the browser)
    if (project.status === 'approved' && !isOwner(req, project) && !req.query.noview) {
      await InvestmentProject.updateOne({ _id: project._id }, { $inc: { views: 1 } });
    }
    const body = project.toObject();
    if (privileged) body.documentImages = (await InvestmentProject.findById(project._id).select('+documentImages').lean())?.documentImages || [];
    res.json({ success: true, project: body });
  } catch (err) {
    next(err);
  }
};

// GET /projects/mine — the owner's projects with their unread interest requests
export const getMyProjects = async (req, res, next) => {
  try {
    const projects = await InvestmentProject.find({ owner: req.user._id }).select('+documentImages').sort({ createdAt: -1 }).lean();
    const unread = await InvestorInterest.aggregate([
      { $match: { owner: req.user._id, seen: false } },
      { $group: { _id: '$project', n: { $sum: 1 } } },
    ]);
    const byProject = new Map(unread.map((u) => [String(u._id), u.n]));
    projects.forEach((p) => (p.unreadInterests = byProject.get(String(p._id)) || 0));
    res.json({ success: true, projects });
  } catch (err) {
    next(err);
  }
};

// POST /projects (multipart: fields + images[] + documents[])
export const createProject = async (req, res, next) => {
  try {
    const kind = req.body.kind === 'capital' ? 'capital' : 'asset';
    // an investor's search has no property yet: no ownership document
    const docs = kind === 'capital' ? [] : documentsOf(req);
    // a photo of the ownership document is needed for the admin's check (unless the papers are being regularised)
    if (kind === 'asset' && req.user.role !== 'admin' && !docs.length && (req.body.landDocument || 'Acte notarié') !== NO_DOCUMENT) {
      return res.status(400).json({ success: false, message: 'Add a photo of the property documents' });
    }
    const [images, documentImages] = await Promise.all([
      uploadMany(photosOf(req), 'dzhotels/projects'),
      uploadMany(docs.slice(0, MAX_DOCUMENTS), 'dzhotels/project-documents'),
    ]);
    const coordinates = parseCoordinates(req.body);
    const project = await InvestmentProject.create({
      ...pick(req.body, EDITABLE),
      ...(coordinates && { coordinates }),
      kind,
      images,
      documentImages,
      owner: req.user._id,
      contactPhone: req.body.contactPhone || req.user.phone || '',
      contactEmail: req.body.contactEmail || req.user.email || '',
      // admins publish directly; everybody else's projects wait for moderation
      status: req.user.role === 'admin' ? 'approved' : 'pending',
    });
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// PUT /projects/:id — owner (goes back to moderation) or admin
export const updateProject = async (req, res, next) => {
  try {
    const project = await InvestmentProject.findById(req.params.id).select('+documentImages');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const admin = req.user.role === 'admin';
    if (!admin && !isOwner(req, project)) return res.status(403).json({ success: false, message: 'Not authorized' });

    // Document photos are checked before anything is changed: at most 2, and at least 1 when the
    // form sent its list (unless the papers are being regularised)
    const keepDocs = keptIds(req.body.keepDocuments);
    const keptDocs = keepDocs ? project.documentImages.filter((i) => keepDocs.includes(i.publicId)) : project.documentImages;
    const capital = project.kind === 'capital';
    const newDocs = capital ? [] : documentsOf(req);
    if (keptDocs.length + newDocs.length > MAX_DOCUMENTS) {
      return res.status(400).json({ success: false, message: 'At most 2 photos of the documents' });
    }
    if (!capital && !admin && keepDocs && !keptDocs.length && !newDocs.length && (req.body.landDocument || project.landDocument) !== NO_DOCUMENT) {
      return res.status(400).json({ success: false, message: 'Add a photo of the property documents' });
    }
    // a property keeps its commune and area (required); an investor's search may empty them
    if (!capital && (req.body.city === '' || req.body.area === '')) {
      return res.status(400).json({ success: false, message: 'City and area are required' });
    }

    Object.assign(project, pick(req.body, EDITABLE));
    if (req.body.ownerShare === '') project.ownerShare = undefined;
    if (req.body.budget === '') project.budget = 0; // emptied in the form: 'to be defined'
    if (req.body.budgetMin === '') project.budgetMin = undefined;
    if (req.body.areaMax === '') project.areaMax = undefined;
    if (capital && req.body.area === '') project.area = undefined;
    if (capital && req.body.city === '') project.city = '';
    const coordinates = parseCoordinates(req.body);
    if (coordinates) project.coordinates = coordinates;
    // photos removed in the form (list of public ids to keep), then new uploads appended
    if (req.body.keepImages !== undefined) {
      let keep = [];
      try {
        keep = JSON.parse(req.body.keepImages);
      } catch {
        keep = [];
      }
      const removed = project.images.filter((i) => !keep.includes(i.publicId));
      removed.forEach((i) => destroyImage(i.publicId));
      project.images = project.images.filter((i) => keep.includes(i.publicId));
    }
    if (photosOf(req).length) project.images.push(...(await uploadMany(photosOf(req), 'dzhotels/projects')));
    // document photos (checked above): drop the removed ones, then add the new uploads
    if (keepDocs) {
      project.documentImages.filter((i) => !keepDocs.includes(i.publicId)).forEach((i) => destroyImage(i.publicId));
      project.documentImages = keptDocs;
    }
    if (newDocs.length) project.documentImages.push(...(await uploadMany(newDocs, 'dzhotels/project-documents')));
    if (project.assetType !== 'Autre bien') project.assetOther = '';
    if (project.landDocument !== 'Autre') project.documentOther = '';
    if (!admin) {
      project.status = 'pending';
      project.rejectionReason = '';
    }
    await project.save();
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// DELETE /projects/:id — owner or admin
export const deleteProject = async (req, res, next) => {
  try {
    const project = await InvestmentProject.findById(req.params.id).select('+documentImages');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user.role !== 'admin' && !isOwner(req, project)) return res.status(403).json({ success: false, message: 'Not authorized' });
    [...project.images, ...(project.documentImages || [])].forEach((i) => destroyImage(i.publicId));
    await InvestorInterest.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /projects/:id/interest { name, phone, email?, amount?, message } — an investor contacts the owner
export const expressInterest = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = await InvestmentProject.findOne({ _id: req.params.id, status: 'approved' }).populate('owner', 'email fullName');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user && isOwner(req, project)) return res.status(400).json({ success: false, message: 'This is your own project' });

    const { name, phone, email, amount, message } = req.body;
    const interest = await InvestorInterest.create({
      project: project._id,
      owner: project.owner._id,
      investor: req.user?._id,
      name,
      phone,
      email: email || req.user?.email || '',
      amount: amount || undefined,
      message,
    });
    await InvestmentProject.updateOne({ _id: project._id }, { $inc: { interestsCount: 1 } });

    notify(
      project.owner.email,
      project.kind === 'capital' ? `💼 Un propriétaire répond à votre recherche — ${project.title}` : `💼 Un investisseur s'intéresse à votre projet — ${project.title}`,
      `<p>Bonjour ${escapeHtml(project.owner.fullName)},</p>
       <p><strong>${escapeHtml(name)}</strong> s'intéresse à votre projet <strong>${escapeHtml(project.title)}</strong> (${escapeHtml(project.reference)}).</p>
       <p>Téléphone : ${escapeHtml(phone)}${email ? ` · Email : ${escapeHtml(email)}` : ''}${amount ? ` · Montant envisagé : ${Number(amount).toLocaleString('fr-DZ')} DZD` : ''}</p>
       <blockquote>${escapeHtml(message)}</blockquote>
       <p><a href="${CLIENT_URL}/projects/mine">Voir les demandes dans votre espace</a></p>`
    );
    res.status(201).json({ success: true, message: 'Your request has been sent to the owner', interest: { _id: interest._id } });
  } catch (err) {
    next(err);
  }
};

// GET /projects/:id/interests — requests received for one project (owner or admin); marks them seen
export const getProjectInterests = async (req, res, next) => {
  try {
    const project = await InvestmentProject.findById(req.params.id).select('owner title');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user.role !== 'admin' && !isOwner(req, project)) return res.status(403).json({ success: false, message: 'Not authorized' });
    const interests = await InvestorInterest.find({ project: project._id }).sort({ createdAt: -1 }).lean();
    if (isOwner(req, project)) await InvestorInterest.updateMany({ project: project._id, seen: false }, { $set: { seen: true } });
    res.json({ success: true, interests });
  } catch (err) {
    next(err);
  }
};

// ── Admin ───────────────────────────────────────────────────────

// GET /admin/projects?status=pending|approved|rejected
export const getProjectQueue = async (req, res, next) => {
  try {
    const status = ['approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const [projects, pending] = await Promise.all([
      InvestmentProject.find({ status }).select('+documentImages').populate('owner', 'fullName email phone').sort({ updatedAt: -1 }).lean(),
      InvestmentProject.countDocuments({ status: 'pending' }),
    ]);
    res.json({ success: true, pending, projects });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/projects/:id/approve
export const approveProject = async (req, res, next) => {
  try {
    const project = await InvestmentProject.findByIdAndUpdate(req.params.id, { status: 'approved', rejectionReason: '' }, { new: true }).populate('owner', 'email fullName');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    notify(
      project.owner?.email,
      `✅ Votre projet est publié — ${project.title}`,
      `<p>Bonjour ${escapeHtml(project.owner?.fullName || '')},</p><p>Votre projet <strong>${escapeHtml(project.title)}</strong> est en ligne : ${project.kind === 'capital' ? 'les propriétaires de biens' : 'les investisseurs'} peuvent vous contacter.</p><p><a href="${CLIENT_URL}/investir/${project._id}">Voir le projet</a></p>`
    );
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/projects/:id/reject { reason }
export const rejectProject = async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (reason.length < 3) return res.status(400).json({ success: false, message: 'Give the reason for the rejection' });
    const project = await InvestmentProject.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason }, { new: true }).populate('owner', 'email fullName');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    notify(
      project.owner?.email,
      `Votre projet n'a pas été accepté — ${project.title}`,
      `<p>Bonjour ${escapeHtml(project.owner?.fullName || '')},</p><p>Votre projet <strong>${escapeHtml(project.title)}</strong> n'a pas été accepté.</p><p>Motif : <em>${escapeHtml(reason)}</em></p><p><a href="${CLIENT_URL}/projects/mine">Modifier le projet</a></p>`
    );
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};
