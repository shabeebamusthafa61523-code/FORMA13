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

// 6. Quotation Terms & Conditions Management
router.get('/terms', fabricationController.getQuotationTerms);
router.post('/terms', fabricationController.createQuotationTerm);
router.put('/terms/:id', fabricationController.updateQuotationTerm);
router.delete('/terms/:id', fabricationController.deleteQuotationTerm);
router.post('/terms/reset', fabricationController.resetQuotationTerms);

// 7. Job-specific Terms Snapshot
router.put('/jobs/:id/terms', fabricationController.updateJobTerms);

// 8. Fabrication Raw Materials Management
router.get('/materials', fabricationController.getFabricationMaterials);
router.post('/materials', fabricationController.createFabricationMaterial);
router.put('/materials/:id', fabricationController.updateFabricationMaterial);
router.delete('/materials/:id', fabricationController.deleteFabricationMaterial);
router.post('/materials/reset', fabricationController.resetFabricationMaterials);

// 9. Fabrication Work Scope Templates Management
router.get('/work-scopes', fabricationController.getFabricationWorkScopes);
router.post('/work-scopes', fabricationController.createFabricationWorkScope);
router.put('/work-scopes/:id', fabricationController.updateFabricationWorkScope);
router.delete('/work-scopes/:id', fabricationController.deleteFabricationWorkScope);
router.post('/work-scopes/reset', fabricationController.resetFabricationWorkScopes);

// 10. Fabrication Purchase Item Presets Management
router.get('/item-presets', fabricationController.getFabricationItemPresets);
router.post('/item-presets', fabricationController.createFabricationItemPreset);
router.put('/item-presets/:id', fabricationController.updateFabricationItemPreset);
router.delete('/item-presets/:id', fabricationController.deleteFabricationItemPreset);
router.post('/item-presets/reset', fabricationController.resetFabricationItemPresets);

// 11. Fabrication Vendors Directory (MongoDB)
router.get('/vendors', fabricationController.getFabricationVendors);
router.post('/vendors', fabricationController.createFabricationVendor);

// 12. Fabrication Expense Categories (MongoDB)
router.get('/expense-categories', fabricationController.getFabricationExpenseCategories);

// 13. Retroactive Sync Route to Accounts
router.post('/sync-to-accounts', fabricationController.syncAllFabricationToAccounts);

// 14. Fabrication Quotation Units Management
router.get('/units', fabricationController.getFabricationUnits);
router.post('/units', fabricationController.createFabricationUnit);
router.put('/units/:id', fabricationController.updateFabricationUnit);
router.delete('/units/:id', fabricationController.deleteFabricationUnit);
router.post('/units/reset', fabricationController.resetFabricationUnits);

export default router;
