import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/fabrication`;
};

const getAuthHeaders = () => {
  let token = localStorage.getItem('token') || '';
  token = token.replace(/^"(.*)"$/, '$1').trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

// 1. Job CRUD
export const getFabricationJobs = async (params = {}) => {
  const response = await axios.get(`${getBaseUrl()}/jobs`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getFabricationJobById = async (id) => {
  if (!id) return { success: false, message: 'Invalid Job ID' };
  const response = await axios.get(`${getBaseUrl()}/jobs/${id}`, getAuthHeaders());
  return response.data;
};

export const getOrCreateClientJob = async (clientId) => {
  if (!clientId) return { success: false, message: 'Invalid Client ID' };
  const response = await axios.get(`${getBaseUrl()}/client/${clientId}`, getAuthHeaders());
  return response.data;
};

export const createFabricationJob = async (jobData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs`, jobData, getAuthHeaders());
  return response.data;
};

export const updateFabricationJob = async (id, jobData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${id}`, jobData, getAuthHeaders());
  return response.data;
};

export const deleteFabricationJob = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${id}`, getAuthHeaders());
  return response.data;
};

// 2. Quotation Items CRUD
export const addQuotationItem = async (jobId, itemData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs/${jobId}/quotation-items`, itemData, getAuthHeaders());
  return response.data;
};

export const updateQuotationItem = async (jobId, itemId, itemData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/quotation-items/${itemId}`, itemData, getAuthHeaders());
  return response.data;
};

export const deleteQuotationItem = async (jobId, itemId) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${jobId}/quotation-items/${itemId}`, getAuthHeaders());
  return response.data;
};

// 2.1. Quotation Sub-Items CRUD
export const addQuotationSubItem = async (jobId, itemId, subItemData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs/${jobId}/quotation-items/${itemId}/sub-items`, subItemData, getAuthHeaders());
  return response.data;
};

export const updateQuotationSubItem = async (jobId, itemId, subItemId, subItemData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/quotation-items/${itemId}/sub-items/${subItemId}`, subItemData, getAuthHeaders());
  return response.data;
};

export const deleteQuotationSubItem = async (jobId, itemId, subItemId) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${jobId}/quotation-items/${itemId}/sub-items/${subItemId}`, getAuthHeaders());
  return response.data;
};

export const updateQuotationDiscount = async (jobId, discountData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/quotation-discount`, discountData, getAuthHeaders());
  return response.data;
};

// 3. Daily Wages CRUD
export const addDailyWage = async (jobId, wageData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs/${jobId}/wages`, wageData, getAuthHeaders());
  return response.data;
};

export const updateDailyWage = async (jobId, wageId, wageData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/wages/${wageId}`, wageData, getAuthHeaders());
  return response.data;
};

export const deleteDailyWage = async (jobId, wageId) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${jobId}/wages/${wageId}`, getAuthHeaders());
  return response.data;
};

// 4. Purchases & Expenses CRUD (Dropdown unit, Rate, Quantity, Auto-calc)
export const addPurchaseExpense = async (jobId, expenseData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs/${jobId}/expenses`, expenseData, getAuthHeaders());
  return response.data;
};

export const updatePurchaseExpense = async (jobId, expenseId, expenseData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/expenses/${expenseId}`, expenseData, getAuthHeaders());
  return response.data;
};

export const deletePurchaseExpense = async (jobId, expenseId) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${jobId}/expenses/${expenseId}`, getAuthHeaders());
  return response.data;
};

// 5. Client Payments Received CRUD ("Amount Given")
export const addClientPayment = async (jobId, paymentData) => {
  const response = await axios.post(`${getBaseUrl()}/jobs/${jobId}/payments`, paymentData, getAuthHeaders());
  return response.data;
};

export const updateClientPayment = async (jobId, paymentId, paymentData) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/payments/${paymentId}`, paymentData, getAuthHeaders());
  return response.data;
};

export const deleteClientPayment = async (jobId, paymentId) => {
  const response = await axios.delete(`${getBaseUrl()}/jobs/${jobId}/payments/${paymentId}`, getAuthHeaders());
  return response.data;
};

// 6. Quotation Terms & Conditions CRUD (MongoDB)
export const getQuotationTerms = async () => {
  const response = await axios.get(`${getBaseUrl()}/terms`, getAuthHeaders());
  return response.data;
};

export const createQuotationTerm = async (termData) => {
  const response = await axios.post(`${getBaseUrl()}/terms`, termData, getAuthHeaders());
  return response.data;
};

export const updateQuotationTerm = async (id, termData) => {
  const response = await axios.put(`${getBaseUrl()}/terms/${id}`, termData, getAuthHeaders());
  return response.data;
};

export const deleteQuotationTerm = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/terms/${id}`, getAuthHeaders());
  return response.data;
};

export const resetQuotationTerms = async () => {
  const response = await axios.post(`${getBaseUrl()}/terms/reset`, {}, getAuthHeaders());
  return response.data;
};

export const updateJobTerms = async (jobId, terms) => {
  const response = await axios.put(`${getBaseUrl()}/jobs/${jobId}/terms`, { terms }, getAuthHeaders());
  return response.data;
};

// 7. Quotation Materials Management (MongoDB)
export const getFabricationMaterials = async () => {
  const response = await axios.get(`${getBaseUrl()}/materials`, getAuthHeaders());
  return response.data;
};

export const createFabricationMaterial = async (data) => {
  const response = await axios.post(`${getBaseUrl()}/materials`, data, getAuthHeaders());
  return response.data;
};

export const updateFabricationMaterial = async (id, data) => {
  const response = await axios.put(`${getBaseUrl()}/materials/${id}`, data, getAuthHeaders());
  return response.data;
};

export const deleteFabricationMaterial = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/materials/${id}`, getAuthHeaders());
  return response.data;
};

export const resetFabricationMaterials = async () => {
  const response = await axios.post(`${getBaseUrl()}/materials/reset`, {}, getAuthHeaders());
  return response.data;
};

// 8. Quotation Work Scope Templates Management (MongoDB)
export const getFabricationWorkScopes = async () => {
  const response = await axios.get(`${getBaseUrl()}/work-scopes`, getAuthHeaders());
  return response.data;
};

export const createFabricationWorkScope = async (data) => {
  const response = await axios.post(`${getBaseUrl()}/work-scopes`, data, getAuthHeaders());
  return response.data;
};

export const updateFabricationWorkScope = async (id, data) => {
  const response = await axios.put(`${getBaseUrl()}/work-scopes/${id}`, data, getAuthHeaders());
  return response.data;
};

export const deleteFabricationWorkScope = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/work-scopes/${id}`, getAuthHeaders());
  return response.data;
};

export const resetFabricationWorkScopes = async () => {
  const response = await axios.post(`${getBaseUrl()}/work-scopes/reset`, {}, getAuthHeaders());
  return response.data;
};

// 9. Purchase Item Presets Management (MongoDB)
export const getFabricationItemPresets = async () => {
  const response = await axios.get(`${getBaseUrl()}/item-presets`, getAuthHeaders());
  return response.data;
};

export const createFabricationItemPreset = async (data) => {
  const response = await axios.post(`${getBaseUrl()}/item-presets`, data, getAuthHeaders());
  return response.data;
};

export const updateFabricationItemPreset = async (id, data) => {
  const response = await axios.put(`${getBaseUrl()}/item-presets/${id}`, data, getAuthHeaders());
  return response.data;
};

export const deleteFabricationItemPreset = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/item-presets/${id}`, getAuthHeaders());
  return response.data;
};

export const resetFabricationItemPresets = async () => {
  const response = await axios.post(`${getBaseUrl()}/item-presets/reset`, {}, getAuthHeaders());
  return response.data;
};

// 10. Fabrication Vendors (MongoDB)
export const getFabricationVendors = async () => {
  const response = await axios.get(`${getBaseUrl()}/vendors`, getAuthHeaders());
  return response.data;
};

export const createFabricationVendor = async (data) => {
  const response = await axios.post(`${getBaseUrl()}/vendors`, data, getAuthHeaders());
  return response.data;
};

// 11. Fabrication Expense Categories (MongoDB)
export const getFabricationExpenseCategories = async () => {
  const response = await axios.get(`${getBaseUrl()}/expense-categories`, getAuthHeaders());
  return response.data;
};

// 12. Fabrication Quotation Units (MongoDB)
export const getFabricationUnits = async () => {
  const response = await axios.get(`${getBaseUrl()}/units`, getAuthHeaders());
  return response.data;
};

export const createFabricationUnit = async (data) => {
  const response = await axios.post(`${getBaseUrl()}/units`, data, getAuthHeaders());
  return response.data;
};

export const updateFabricationUnit = async (id, data) => {
  const response = await axios.put(`${getBaseUrl()}/units/${id}`, data, getAuthHeaders());
  return response.data;
};

export const deleteFabricationUnit = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/units/${id}`, getAuthHeaders());
  return response.data;
};

export const resetFabricationUnits = async () => {
  const response = await axios.post(`${getBaseUrl()}/units/reset`, {}, getAuthHeaders());
  return response.data;
};

