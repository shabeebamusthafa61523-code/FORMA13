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
