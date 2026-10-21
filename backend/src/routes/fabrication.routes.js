import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import * as fabricationController from '../controllers/fabrication.controller.js';

const router = Router();

// Apply authentication middleware to all fabrication endpoints
router.use(protectRoute);

// 1. Core Fabrication Job CRUD
router.get('/jobs', fabricationController.getFabricationJobs);
router.post('/jobs', fabricationController.createFabricationJob);
router.get('/jobs/:id', fabricationController.getFabricationJobById);
router.get('/client/:clientId', fabricationController.getOrCreateClientJob);
router.put('/jobs/:id', fabricationController.updateFabricationJob);
router.delete('/jobs/:id', fabricationController.deleteFabricationJob);

// 2. Quotation Line Items CRUD & Overall Discount
router.post('/jobs/:id/quotation-items', fabricationController.addQuotationItem);
router.put('/jobs/:id/quotation-items/:itemId', fabricationController.updateQuotationItem);
router.delete('/jobs/:id/quotation-items/:itemId', fabricationController.deleteQuotationItem);
router.put('/jobs/:id/quotation-discount', fabricationController.updateQuotationDiscount);

// 3. Employee Daily Wages CRUD (Date picker & User selection)
router.post('/jobs/:id/wages', fabricationController.addDailyWage);
router.put('/jobs/:id/wages/:wageId', fabricationController.updateDailyWage);
router.delete('/jobs/:id/wages/:wageId', fabricationController.deleteDailyWage);

// 4. Purchases & Expenses CRUD (Dropdown for Sq.Ft/Inches/etc., Rate, Quantity, Auto-Calculate)
router.post('/jobs/:id/expenses', fabricationController.addPurchaseExpense);
router.put('/jobs/:id/expenses/:expenseId', fabricationController.updatePurchaseExpense);
router.delete('/jobs/:id/expenses/:expenseId', fabricationController.deletePurchaseExpense);

// 5. Client Payments Received ("Amount Given") CRUD
router.post('/jobs/:id/payments', fabricationController.addClientPayment);
router.put('/jobs/:id/payments/:paymentId', fabricationController.updateClientPayment);
router.delete('/jobs/:id/payments/:paymentId', fabricationController.deleteClientPayment);

export default router;
