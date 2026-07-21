const { randomUUID } = require('crypto');

function scheduleReEngagementCampaign(clientId, riskTrigger, template, options = {}) {
  if (typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('ValueError: clientId must be a non-empty string');
  }
  if (riskTrigger !== 'high') {
    throw new Error('ValueError: riskTrigger must be "high"');
  }
  if (!template || typeof template !== 'object') {
    throw new Error('ValueError: template is required');
  }
  if (typeof template.subject !== 'string' || template.subject.length > 128) {
    throw new Error('ValueError: template.subject must be a string ≤128 chars');
  }
  if (typeof template.body !== 'string') {
    throw new Error('ValueError: template.body must be a string');
  }
  let body = template.body;
  if (body.length > 2000) {
    body = body.slice(0, 2000);
    console.warn('Warning: template.body truncated to 2000 chars');
  }
  if (template.channel !== 'email' && template.channel !== 'sms') {
    throw new Error('ValueError: template.channel must be "email" or "sms"');
  }
  const delayHours = options.delayHours !== undefined ? options.delayHours : 0;
  if (typeof delayHours !== 'number' || delayHours < 0 || !Number.isInteger(delayHours)) {
    throw new Error('ValueError: options.delayHours must be a non-negative integer');
  }
  const cappedDelayHours = Math.min(delayHours, 720);
  const suppressIfContactedDays = options.suppressIfContactedDays !== undefined ? options.suppressIfContactedDays : 0;
  if (typeof suppressIfContactedDays !== 'number' || suppressIfContactedDays < 0 || !Number.isInteger(suppressIfContactedDays)) {
    throw new Error('ValueError: options.suppressIfContactedDays must be a non-negative integer');
  }
  const clientData = getClientData(clientId);
  if (!clientData) {
    throw new Error(`Client ${clientId} not found`);
  }
  if (template.channel === 'email' && !clientData.email) {
    throw new Error(`Client ${clientId} has no email address`);
  }
  const existingCampaign = getPendingCampaign(clientId, riskTrigger);
  if (existingCampaign) {
    return {
      campaignId: existingCampaign.campaignId,
      scheduledAt: existingCampaign.scheduledAt,
      status: 'queued'
    };
  }
  const parsedLastContact = clientData.lastTrainerContactDate ? new Date(clientData.lastTrainerContactDate) : null;
  const lastContactDate = parsedLastContact && Number.isFinite(parsedLastContact.getTime()) ? parsedLastContact : null;
  let status = 'queued';
  if (suppressIfContactedDays > 0 && lastContactDate) {
    const now = new Date();
    const diffMs = now - lastContactDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= suppressIfContactedDays) {
      status = 'suppressed';
    }
  }
  const scheduledAt = new Date(Date.now() + cappedDelayHours * 60 * 60 * 1000).toISOString();
  const campaignId = generateUUID();
  saveCampaign({ campaignId, clientId, riskTrigger, template: { ...template, body }, scheduledAt, status });
  return { campaignId, scheduledAt, status };
}
function getClientData(clientId) {
  const store = global.__clientStore || {};
  return store[clientId] || null;
}
function getPendingCampaign(clientId, riskTrigger) {
  const campaigns = global.__campaignStore || {};
  const key = `${clientId}_${riskTrigger}`;
  return campaigns[key] && campaigns[key].status === 'queued' ? campaigns[key] : null;
}
function saveCampaign(campaign) {
  if (!global.__campaignStore) global.__campaignStore = {};
  const key = `${campaign.clientId}_${campaign.riskTrigger}`;
  global.__campaignStore[key] = campaign;
}
function generateUUID() {
  return randomUUID();
}
module.exports = { scheduleReEngagementCampaign };
