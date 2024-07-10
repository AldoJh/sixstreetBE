<<<<<<< Updated upstream
import Express from 'express';
import { getAllUsers, createUser, login, logout, verifyOTP, detail, update, forgotPassword, changePassword, addAddress, deleteAddress, updateAddress } from '../controller/user.js';
import { verifyToken } from '../middleware/verifytoken.js';
import { refreshToken } from '../controller/refreshtoken.js';
import { createNews, getNews, updateNews, findnews, deleteNews } from '../controller/news.js';
const router = Express.Router();

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
router.post('/addAddress', verifyToken, addAddress);
router.delete('/deleteAddress', verifyToken, deleteAddress);
router.put('/updateAddress', verifyToken, updateAddress);
router.post('/createnews', verifyToken, createNews);
router.get('/getnews', getNews);
router.put('/updatenews/:id', verifyToken, updateNews);
router.get('/news', findnews);
router.delete('/deletenews/:id', verifyToken, deleteNews);

export default router;
=======
import Express  from "express";
import {getAllUsers, createUser, login, logout, verifyOTP, detail, update,forgotPassword,changePassword,addAddress,deleteAddress,updateAddress} from "../controller/user.js";
import {verifyToken} from "../middleware/verifytoken.js";
import {refreshToken} from "../controller/refreshtoken.js";
import {createNews,getNews,updateNews, findnews,deleteNews} from "../controller/news.js";
import {getCart} from "../controller/cart.js";
const router = Express.Router();

router.get("/user", verifyToken , getAllUsers);
router.post("/user", createUser);
router.post("/login", login);
router.get("/refreshtoken", refreshToken);
router.delete("/logout", logout);
router.post("/verifyOTP", verifyOTP);
router.get("/detail", verifyToken, detail);
router.put("/update", verifyToken, update);
router.post("/forgotPassword", forgotPassword);
router.post("/changePassword", changePassword);
router.post("/addAddress", verifyToken, addAddress);
router.delete("/deleteAddress", verifyToken, deleteAddress);
router.put("/updateAddress", verifyToken, updateAddress);
router.post("/createnews", verifyToken, createNews);
router.get("/getnews", getNews);
router.put("/updatenews/:id", verifyToken, updateNews);
router.get("/news", findnews);
router.delete("/deletenews/:id", verifyToken, deleteNews);
router.get("/cart", verifyToken, getCart);


export default router;
>>>>>>> Stashed changes
