import Client from '../models/client.model.js';
import ClientLead from '../models/clientLead.model.js';
import FabricationJob from '../models/fabricationJob.model.js';

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
        clientDate: lead.leadsReceivedDate || lead.createdAt || new Date(),
        createdBy: currentUserId || lead.createdBy
      });
      await client.save();
    } else {
      let updated = false;
      const targetName = (lead.leadName || lead.companyName || '').trim();
      const targetCompany = (lead.companyName || lead.leadName || '').trim();

      if (targetName && client.clientName !== targetName) {
        client.clientName = targetName;
        updated = true;
      }
      if (targetCompany && client.companyName !== targetCompany) {
        client.companyName = targetCompany;
        updated = true;
      }
      if (cleanPhone && client.phone !== cleanPhone) {
        client.phone = cleanPhone;
        updated = true;
      }
      if (cleanEmail && client.email !== cleanEmail) {
        client.email = cleanEmail;
        updated = true;
      }
      if (client.status !== 'Active') {
        client.status = 'Active';
        updated = true;
      }
      if (updated) {
        await client.save();
      }
    }

    // Cascade update to any existing Workspace FabricationJobs
    if (client && client._id) {
      await FabricationJob.updateMany(
        { client: client._id },
        {
          $set: {
            clientName: client.clientName,
            clientPhone: client.phone,
            clientEmail: client.email || ''
          }
        }
      );
    }

    return client;
  } catch (err) {
    console.error('Error syncing lead to client:', err);
    return null;
  }
};

/**
 * Propagates updates from a ClientLead (e.g., name, company, phone, email)
 * to the corresponding Client in the Clients Directory and to all Workspace FabricationJobs.
 */
export const syncLeadChangesToClientsAndWorkspace = async (lead, currentUserId) => {
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

    const isConfirmed = lead.status && ['confirm', 'confirmed', 'converted'].includes(String(lead.status).toLowerCase());

    if (!client) {
      if (isConfirmed) {
        client = await syncLeadToClient(lead, currentUserId);
      }
      return client;
    }

    // Client exists - propagate updated fields
    const targetClientName = (lead.leadName || lead.companyName || '').trim();
    const targetCompanyName = (lead.companyName || lead.leadName || '').trim();

    let clientUpdated = false;
    if (targetClientName && client.clientName !== targetClientName) {
      client.clientName = targetClientName;
      clientUpdated = true;
    }
    if (targetCompanyName && client.companyName !== targetCompanyName) {
      client.companyName = targetCompanyName;
      clientUpdated = true;
    }
    if (cleanPhone && client.phone !== cleanPhone) {
      client.phone = cleanPhone;
      clientUpdated = true;
    }
    if (cleanEmail && client.email !== cleanEmail) {
      client.email = cleanEmail;
      clientUpdated = true;
    }
    if (isConfirmed && client.status !== 'Active') {
      client.status = 'Active';
      clientUpdated = true;
    }

    if (clientUpdated) {
      await client.save();
    }

    // Ensure lead points to this client
    if (!lead.convertedToClient && client._id) {
      lead.convertedToClient = client._id;
      if (isConfirmed) {
        lead.convertedAt = lead.convertedAt || new Date();
      }
      await ClientLead.findByIdAndUpdate(lead._id, {
        convertedToClient: client._id,
        convertedAt: lead.convertedAt || new Date()
      });
    }

    // Cascade update to all Workspace FabricationJobs
    await FabricationJob.updateMany(
      { client: client._id },
      {
        $set: {
          clientName: client.clientName,
          clientPhone: client.phone,
          clientEmail: client.email || ''
        }
      }
    );

    return client;
  } catch (err) {
    console.error('Error syncing lead changes to clients and workspace:', err);
    return null;
  }
};

/**
 * Propagates updates from a Client (e.g., clientName, companyName, phone, email)
 * to linked ClientLeads and all Workspace FabricationJobs.
 */
export const syncClientChangesToLeadsAndWorkspace = async (client) => {
  try {
    if (!client || !client._id) return;

    // 1. Cascade update to all FabricationJobs in Workspace
    const jobUpdateFields = {};
    if (client.clientName) jobUpdateFields.clientName = client.clientName;
    if (client.phone) jobUpdateFields.clientPhone = client.phone;
    if (client.email) jobUpdateFields.clientEmail = client.email;

    if (Object.keys(jobUpdateFields).length > 0) {
      await FabricationJob.updateMany(
        { client: client._id },
        { $set: jobUpdateFields }
      );
    }

    // 2. Cascade update to linked ClientLead records
    const leadQuery = {
      $or: [
        { convertedToClient: client._id },
        ...(client.phone ? [{ phone: client.phone }] : []),
        ...(client.email ? [{ email: client.email }] : [])
      ]
    };

    const leadUpdateFields = {};
    if (client.clientName) leadUpdateFields.leadName = client.clientName;
    if (client.companyName) leadUpdateFields.companyName = client.companyName;
    if (client.phone) leadUpdateFields.phone = client.phone;
    if (client.email) leadUpdateFields.email = client.email;

    if (Object.keys(leadUpdateFields).length > 0) {
      await ClientLead.updateMany(
        leadQuery,
        { $set: leadUpdateFields }
      );
    }
  } catch (err) {
    console.error('Error syncing client changes to leads and workspace:', err);
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
