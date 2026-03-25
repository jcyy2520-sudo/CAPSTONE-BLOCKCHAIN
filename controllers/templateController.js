import { ProcurementTemplate } from "../models/procurementTemplateModel.js";
import { Procurement } from "../models/procurementModel.js";

/**
 * GET /admin/procurement/templates
 * List all procurement mode templates
 */
export const listTemplates = async (req, res) => {
  try {
    const templates = await ProcurementTemplate.findAll({
      order: [['mode', 'ASC']]
    });

    res.render("admin/procurement-templates", {
      title: "Procurement Templates",
      templates: templates.map(t => t.toJSON())
    });
  } catch (err) {
    console.error("Error listing templates:", err);
    req.flash('error_msg', 'Error retrieving templates');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/procurement/templates/:mode
 * View/edit template for a specific procurement mode
 */
export const viewTemplate = async (req, res) => {
  try {
    const template = await ProcurementTemplate.findOne({
      where: { mode: req.params.mode }
    });

    if (!template) {
      // Return default template for this mode if it doesn't exist yet
      const modes = [
        'Competitive Bidding',
        'Limited Source Bidding',
        'Direct Contracting',
        'Repeat Order',
        'Small Value Procurement',
        'Negotiated Procurement',
        'Competitive Dialogue',
        'Unsolicited Offer with Bid Matching',
        'Direct Acquisition',
        'Direct Sales',
        'Direct Procurement for Science, Technology and Innovation'
      ];

      if (!modes.includes(req.params.mode)) {
        req.flash('error_msg', 'Invalid procurement mode');
        return res.redirect('/admin/procurement/templates');
      }

      // Create default template
      const newTemplate = await ProcurementTemplate.create({
        mode: req.params.mode,
        description: `Template for ${req.params.mode}`,
        required_bidder_documents: [
          { name: 'business_permit', label: 'Business Permit', required: true, format: 'PDF' },
          { name: 'tax_clearance', label: 'Tax Clearance', required: true, format: 'PDF' },
          { name: 'philgeps_cert', label: 'PhilGEPS Certificate', required: true, format: 'PDF' },
          { name: 'financial_statements', label: 'Financial Statements', required: true, format: 'PDF' }
        ],
        required_bid_documents: [
          { name: 'technical_proposal', label: 'Technical Proposal', required: true, format: 'PDF,DOCX' },
          { name: 'financial_proposal', label: 'Financial Proposal', required: true, format: 'XLSX,PDF' }
        ]
      });

      return res.render("admin/template-edit", {
        title: `Edit ${req.params.mode} Template`,
        template: newTemplate.toJSON(),
        isNew: true
      });
    }

    res.render("admin/template-edit", {
      title: `Edit ${template.mode} Template`,
      template: template.toJSON(),
      isNew: false
    });
  } catch (err) {
    console.error("Error viewing template:", err);
    req.flash('error_msg', 'Error retrieving template');
    return res.redirect('/admin/procurement/templates');
  }
};

/**
 * POST /admin/procurement/templates/:mode
 * Save/update template for a procurement mode
 */
export const saveTemplate = async (req, res) => {
  try {
    const { mode } = req.params;
    const {
      description,
      required_bidder_documents,
      required_bid_documents,
      evaluation_criteria,
      notes
    } = req.body;

    let template = await ProcurementTemplate.findOne({ where: { mode } });

    if (template) {
      // Update existing
      await template.update({
        description,
        required_bidder_documents: typeof required_bidder_documents === 'string'
          ? JSON.parse(required_bidder_documents)
          : required_bidder_documents,
        required_bid_documents: typeof required_bid_documents === 'string'
          ? JSON.parse(required_bid_documents)
          : required_bid_documents,
        evaluation_criteria: typeof evaluation_criteria === 'string'
          ? JSON.parse(evaluation_criteria)
          : evaluation_criteria,
        notes
      });
    } else {
      // Create new
      template = await ProcurementTemplate.create({
        mode,
        description,
        required_bidder_documents: typeof required_bidder_documents === 'string'
          ? JSON.parse(required_bidder_documents)
          : required_bidder_documents,
        required_bid_documents: typeof required_bid_documents === 'string'
          ? JSON.parse(required_bid_documents)
          : required_bid_documents,
        evaluation_criteria: typeof evaluation_criteria === 'string'
          ? JSON.parse(evaluation_criteria)
          : evaluation_criteria,
        notes
      });
    }

    req.flash('success_msg', `Template for ${mode} saved successfully`);
    return res.redirect('/admin/procurement/templates');
  } catch (err) {
    console.error("Error saving template:", err);
    req.flash('error_msg', 'Error saving template');
    return res.redirect(`/admin/procurement/templates/${req.params.mode}`);
  }
};

/**
 * GET /procurement-template/:procurementId
 * Get template requirements for a specific procurement (bidder view)
 */
export const getProcurementTemplate = async (req, res) => {
  try {
    const procurement = await Procurement.findByPk(req.params.procurementId);

    if (!procurement) {
      return res.status(404).json({ error: 'Procurement not found' });
    }

    const template = await ProcurementTemplate.findOne({
      where: { mode: procurement.mode }
    });

    return res.json({
      procurement: {
        id: procurement.id,
        title: procurement.title,
        mode: procurement.mode,
        closing_date: procurement.bid_closing_date
      },
      template: template ? template.toJSON() : null
    });
  } catch (err) {
    console.error("Error getting procurement template:", err);
    return res.status(500).json({ error: 'Error retrieving template' });
  }
};

/**
 * GET /admin/procurement-setup/:mode
 * Quick setup for procurement - shows template and allows configuration
 */
export const procurementSetup = async (req, res) => {
  try {
    const { mode } = req.params;

    const template = await ProcurementTemplate.findOne({
      where: { mode }
    });

    res.render("admin/procurement-setup", {
      title: `Setup ${mode} Procurement`,
      mode,
      template: template ? template.toJSON() : null
    });
  } catch (err) {
    console.error("Error in setup:", err);
    req.flash('error_msg', 'Error setting up procurement');
    return res.redirect('/admin/dashboard');
  }
};
