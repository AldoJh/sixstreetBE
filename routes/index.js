import Express from 'express';
import {
  getAllUsers,
  createUser,
  login,
  logout,
  verifyOTP,
  detail,
  update,
  forgotPassword,
  changePassword,
  addAddress,
  deleteAddress,
  updateAddress,
  getAddress,
  loginJubelio,
  getProvinces,
  getCities,
  calculateCost,
  getSubdistricts,
  getVouchers,
  getVoucherById,
  subscribeNewsletter,
} from '../controller/user.js';
import { verifyToken } from '../middleware/verifytoken.js';
import { refreshToken } from '../controller/refreshtoken.js';
import { createNews, getNews, updateNews, findnews, deleteNews, getNewsById, getNewsByJudul } from '../controller/news.js';
import { getCart, addToCart, updateCart, deleteCart, deleteAllCart, implement_voucher, implement_voucher_sixstreet } from '../controller/cart.js';
import { getTransaction, getTransactionByUuid, createTransaction, updateTransaction, deleteTransaction, paymentGateway, getAllTransactions, transactionNotification, updateTransactionByUuid } from '../controller/transaction.js';
import { getMembershipStatus, redeemPoints, processTransactionPoints, getPointsHistory, sendMonthlyReminder } from '../controller/membership.js';
import { sendEmail, cek_password } from '../controller/email.js';
const router = Express.Router();
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './upload/newsImage');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 4, // 4MB
  },
  fileFilter: fileFilter,
});

router.get('/refreshtoken', refreshToken);
router.get('/user', verifyToken, getAllUsers);
router.post('/user', createUser);
router.post('/login', login);
router.delete('/logout', logout);
router.post('/verifyOTP', verifyOTP);
router.get('/detail/:id', verifyToken, detail);
router.put('/update/:id', verifyToken, update);
router.post('/forgotPassword', forgotPassword);
router.post('/changePassword', changePassword);
router.get('/getAddress/:user_id', verifyToken, getAddress);
router.post('/addAddress/:user_id', verifyToken, addAddress);
router.delete('/deleteAddress/:user_id/:id', verifyToken, deleteAddress);
router.put('/updateAddress/:user_id/:id', verifyToken, updateAddress);
// News
router.post('/createnews', verifyToken, upload.single('gambar'), createNews);
router.get('/getnews', getNews);
router.get('/getnews/:id', getNewsById);
router.get('/getnewsbyjudul/:judulberita', getNewsByJudul);
router.put('/updatenews/:id', verifyToken, upload.single('gambar'), updateNews);
router.get('/news', findnews);
router.delete('/deletenews/:id', verifyToken, deleteNews);
// Cart
router.get('/cart/:user_id', verifyToken, getCart);
router.post('/cart/:user_id', verifyToken, addToCart);
router.put('/cart/:user_id/:id', verifyToken, updateCart);
router.delete('/cart/:user_id/:id', verifyToken, deleteCart);
router.delete('/cart/:user_id', verifyToken, deleteAllCart);
// Transaction
router.get('/transaction', verifyToken, getAllTransactions);
router.get('/transaction/:user_id', verifyToken, getTransaction);
router.get('/transaction/:user_id/:transaction_uuid', verifyToken, getTransactionByUuid);
router.post('/transaction', verifyToken, createTransaction);
router.put('/transaction/:id', verifyToken, updateTransaction);
router.put('/transaction/:user_id/:transaction_uuid', verifyToken, updateTransactionByUuid);
router.delete('/transaction/:id', verifyToken, deleteTransaction);
router.post('/payment', verifyToken, paymentGateway);
router.post('/transaction/notification', transactionNotification);
// Additional
router.post('/loginjubelio', loginJubelio);
router.post('/sendEmail', sendEmail);
router.post('/cek_password', cek_password);
router.get('/rajaprovince', getProvinces);
router.get('/rajacity', getCities);
router.get('/rajasubdistrict/:city_id', getSubdistricts);
router.post('/rajacost', calculateCost);
// Voucher
router.post('/voucher/:user_id', implement_voucher);
router.post('/voucher_sixstreet/:user_id', implement_voucher_sixstreet);
router.get('/voucher/:user_id', getVoucherById);
router.post('/voucher', getVouchers);
// Newsletter route
router.post('/newsletter', subscribeNewsletter);
// Membership point
router.get('/membership/:user_id', getMembershipStatus);
router.post('/points/redeem', redeemPoints);
router.post('/points/process/:transaction_uuid', processTransactionPoints);
router.get('/points/history/:user_id', getPointsHistory);
router.post('/points/send-reminder', sendMonthlyReminder);

export default router;
