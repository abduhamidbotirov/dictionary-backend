import express from 'express';
import bookController from '../controllers/book.contr.js';
import adminChecker from '../middleware/admin.checker.js';

const router = express.Router();

router.post('/',adminChecker, bookController.createBook.bind(bookController));
router.get('/', bookController.getAllBooks.bind(bookController));
router.get('/:id', bookController.getBookById.bind(bookController));
router.put('/:id', adminChecker, bookController.updateBook.bind(bookController));
router.delete('/:id', adminChecker, bookController.deleteBook.bind(bookController));

export default router;
