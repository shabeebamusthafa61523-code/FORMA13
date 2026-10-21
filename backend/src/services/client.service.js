import Client from '../models/client.model.js';
import ClientLead from '../models/clientLead.model.js';

export const generateClientId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `CLI-${currentYear}-`;
  
  // Find latest client created this year by clientId sequence
  const latestClient = await Client.findOne({ clientId: { $regex: `^${prefix}` } })
    .sort({ clientId: -1 })
    .exec();

  if (!latestClient || !latestClient.clientId) {
    return `${prefix}0001`;
  }

  const parts = latestClient.clientId.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * Creates or synchronizes a Client record from a confirmed ClientLead
 */
export const syncLeadToClient = async (lead, currentUserId) => {
  try {
    if (!lead) return null;

    let client = null;
    if (lead.convertedToClient) {
      client = await Client.findById(lead.convertedToClient);
    }
    const cleanPhone = String(lead.phone || '').trim();
    if (!client && cleanPhone) {
      client = await Client.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: cleanPhone.replace(/\D/g, '') }
        ]
      });
    }
    const cleanEmail = String(lead.email || '').trim().toLowerCase();
    if (!client && cleanEmail) {
      client = await Client.findOne({ email: cleanEmail });
    }

    if (!client) {
      const clientId = await generateClientId();
      const rawPhone = cleanPhone || 'N/A';
      const safeEmail = cleanEmail || `${(cleanPhone.replace(/[^0-9]/g, '') || String(Date.now()))}@client.fabtec.com`;

      client = new Client({
        companyName: (lead.companyName || lead.leadName || 'Valued Client').trim(),
        clientName: (lead.leadName || lead.companyName || 'Valued Client').trim(),
        clientId,
        phone: rawPhone,
        email: safeEmail,
        city: lead.city || '',
        address: lead.city || '',
        status: 'Active',
        notes: lead.remarks || (lead.interestedService ? `Interested in: ${lead.interestedService}` : ''),
        leadSource: lead.source || 'Client Leads',
        createdBy: currentUserId || lead.createdBy
      });
      await client.save();
    } else {
      if (client.status !== 'Active') {
        client.status = 'Active';
        await client.save();
      }
    }
    return client;
  } catch (err) {
    console.error('Error syncing lead to client:', err);
    return null;
  }
};

/**
 * Auto-syncs any confirmed client leads that don't yet have a Client entry
 */
export const syncAllConfirmedLeadsToClients = async () => {
  try {
    const unsyncedLeads = await ClientLead.find({
      status: { $in: ['Confirm', 'Confirmed', 'Converted'] },
      $or: [
        { convertedToClient: null },
        { convertedToClient: { $exists: false } }
      ]
    });

    if (!unsyncedLeads || unsyncedLeads.length === 0) return;

    for (const lead of unsyncedLeads) {
      const client = await syncLeadToClient(lead, lead.createdBy);
      if (client) {
        lead.convertedToClient = client._id;
        lead.convertedAt = lead.convertedAt || new Date();
        lead.status = 'Confirmed';
        await lead.save();
      }
    }
  } catch (err) {
    console.warn('Auto-sync confirmed leads to clients warning:', err.message);
  }
};

export const fetchClientStats = async () => {
  const totalClients = await Client.countDocuments();
  const activeClients = await Client.countDocuments({ status: 'Active' });
  const enterpriseClients = await Client.countDocuments({ clientType: 'Enterprise' });
  const pendingNDAs = await Client.countDocuments({ ndaStatus: 'Pending' });

  const monthlyRevResult = await Client.aggregate([
    { $match: { status: 'Active' } },
    { $group: { _id: null, totalRevenue: { $sum: '$expectedMonthlyRevenue' } } }
  ]);

  const totalMonthlyRevenue = monthlyRevResult[0]?.totalRevenue || 0;

  return {
    totalClients,
    activeClients,
    enterpriseClients,
    pendingNDAs,
    totalMonthlyRevenue
  };
};
