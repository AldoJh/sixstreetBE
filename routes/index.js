
import Express from 'express';
import { getAllUsers, createUser, login, logout, verifyOTP, detail, update, forgotPassword, changePassword, addAddress, deleteAddress, updateAddress, getAddress } from '../controller/user.js';
import { verifyToken } from '../middleware/verifytoken.js';
import { refreshToken } from '../controller/refreshtoken.js';
import { createNews, getNews, updateNews, findnews, deleteNews, getNewsById, getNewsByJudul } from '../controller/news.js';
import { getCart, addToCart, updateCart,deleteCart } from '../controller/cart.js';
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

router.get('/user', verifyToken, getAllUsers);
router.post('/user', createUser);
router.post('/login', login);
router.get('/refreshtoken', refreshToken);
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
router.post('/createnews', verifyToken, upload.single('gambar'), createNews);
router.get('/getnews', getNews);
router.get('/getnews/:id', getNewsById);
router.get('/getnewsbyjudul/:judulberita', getNewsByJudul);
router.put('/updatenews/:id', verifyToken, upload.single('gambar'), updateNews);
router.get('/news', findnews);
router.delete('/deletenews/:id', verifyToken, deleteNews);
router.get('/cart/:id', getCart);
router.post('/cart/:id',verifyToken, addToCart);
router.put('/cart/:id', verifyToken, updateCart);
router.delete('/cart/:id', verifyToken, deleteCart);

export default router;
