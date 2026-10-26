import { Router } from 'express';
import Joi from 'joi';
import {
  getProjects,
  getProject,
  getMyProjects,
  createProject,
  updateProject,
  deleteProject,
  expressInterest,
  getProjectInterests,
} from '../controllers/project.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { interestLimiter } from '../middlewares/rateLimits.middleware.js';
import { phoneRule } from '../validations/common.validation.js';
import { KINDS, ASSET_TYPES, PROJECT_TYPES, PARTNERSHIP_TYPES, LAND_DOCUMENTS } from '../models/InvestmentProject.js';

// Photos of the property (images[]) + photos of the ownership document (documents[], max 2)
const projectFiles = upload.fields([{ name: 'images', maxCount: 10 }, { name: 'documents', maxCount: 2 }]);

const router = Router();

// Property + project, sent as multipart form data (numbers arrive as strings: Joi converts them)
const fields = {
  title: Joi.string().trim().min(5).max(120),
  description: Joi.string().trim().allow('').max(5000),
  assetType: Joi.string().valid(...ASSET_TYPES),
  // 'Autre bien' / 'Autre' must say what it is
  assetOther: Joi.string().trim().allow('').max(80).when('assetType', { is: 'Autre bien', then: Joi.string().trim().min(2).max(80).required() }),
  projectType: Joi.string().valid(...PROJECT_TYPES),
  partnership: Joi.string().valid(...PARTNERSHIP_TYPES),
  country: Joi.string().trim().max(2),
  wilaya: Joi.string().trim().max(60),
  city: Joi.string().trim().allow('').max(80),
  address: Joi.string().trim().allow('').max(200),
  area: Joi.number().min(1).max(100000000).allow(''),
  areaMax: Joi.number().min(1).max(100000000).allow(''),
  budgetMin: Joi.number().min(0).max(1e13).allow(''),
  kind: Joi.string().valid(...KINDS), // set when the listing is created, ignored afterwards
  landDocument: Joi.string().valid(...LAND_DOCUMENTS),
  documentOther: Joi.string().trim().allow('').max(80).when('landDocument', { is: 'Autre', then: Joi.string().trim().min(2).max(80).required() }),
  budget: Joi.number().min(0).max(1e13).allow(''),
  ownerShare: Joi.number().min(0).max(100).allow(''),
  contactPhone: phoneRule().allow(''),
  contactEmail: Joi.string().trim().email().allow('').max(120),
  lat: Joi.number().min(-90).max(90).allow(''),
  lng: Joi.number().min(-180).max(180).allow(''),
  keepImages: Joi.string().max(5000), // JSON list of the photos kept when editing
  keepDocuments: Joi.string().max(2000), // same for the document photos
};
// A property needs its commune and area; an investor's search ('capital') only needs the wilaya
const forAsset = (rule) => Joi.when('kind', { is: 'capital', then: rule, otherwise: rule.invalid('').required() });
const createSchema = Joi.object({ ...fields, title: fields.title.required(), wilaya: fields.wilaya.required(), city: forAsset(fields.city), area: forAsset(fields.area) });
const updateSchema = Joi.object(fields);
const interestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  phone: phoneRule().required(),
  email: Joi.string().trim().email().allow('').max(120),
  amount: Joi.number().min(0).max(1e13).allow(''),
  message: Joi.string().trim().min(10).max(2000).required(),
});

router.get('/', getProjects);
router.get('/mine', protect, getMyProjects); // before /:id
router.get('/:id', optionalAuth, getProject);
router.post('/', protect, projectFiles, validate(createSchema), createProject);
router.put('/:id', protect, projectFiles, validate(updateSchema), updateProject);
router.delete('/:id', protect, deleteProject);
router.post('/:id/interest', interestLimiter, optionalAuth, validate(interestSchema), expressInterest);
router.get('/:id/interests', protect, getProjectInterests);

export default router;
