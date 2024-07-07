import User from "../model/userModel.js";
import Address from "../model/addressModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

//function generate random string
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

//function generate OTP
const generateOTP = (length) => {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

//function get semua data user
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes : ['username', 'no_hp', 'email', 'address', 'referd_kode', 'role', 'membership', 'kode_user'],
        });
        res.json(users);
    } catch (error) {
        res.json({ message: error });
    }
};

//function register user
export const createUser = async (req, res) => {
    const {username, password, no_hp, email, referd_kode} = req.body;
    try {
        // Cek apakah username sudah terdaftar
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Cek apakah no hp sudah terdaftar
        const existingNoHp = await User.findOne({ where: { no_hp } });
        if (existingNoHp) {
            return res.status(400).json({ message: 'No Handphone already exists' });
        }

        // Cek apakah email sudah terdaftar
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Jika username belum terdaftar, buat pengguna baru
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({
            username,
            password: hashedPassword,
            no_hp,
            email,
            referd_kode,
            role: 0,
            membership: 0,
            kode_user: generateRandomString(5),
            OTP: generateOTP(6),
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: false,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'OTP Verification',
            text: `yout otp is ${newUser.OTP}`,  // Pastikan 'text' menggunakan huruf kecil
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return res.status(500).json({ message: 'User created, but email not sent', error: emailError.message });
        }

        // Kirim respons sukses
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Register Unsuccessfully', error: error.message });
    }
};


//function login user
export const login = async (req, res) => {
    try{
        const user = await User.findAll({ 
            where: {
                email: req.body.email,
            },
        });
        const match = await bcrypt.compare(req.body.password, user[0].password); // cek apakah password benar
        if (user.OTP != null) { // cek apakah user sudah verifikasi
            return res.status(400).json({ message: 'User not verified' });
        }else{
        if (match){
            const accessToken = jwt.sign({email: user[0].email, username: user[0].username}, process.env.ACCESS_TOKEN_SECRET,{
                expiresIn: '20s',
            });
            const refreshToken = jwt.sign({email: user[0].email, username: user[0].username}, process.env.REFRESH_TOKEN_SECRET,{
                expiresIn: '1d',
            });
            await User.update({refreshToken: refreshToken}, {
                where: {
                    email: req.body.email,
                },
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            });
            res.json({accessToken: accessToken});
        } else {
            res.json({message: 'Wrong password'});
        }
    }
        
    } catch (error){
        console.error('Error login:', error);
        res.status(500).json({ message: 'email not register' });
    }

};

//function logout user
export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(204); // Unauthorized

    const users = await User.findAll({
        where: {
            refreshToken: refreshToken
        }
    });
    if (!users.length) return res.sendStatus(204); // Forbidden
    const email = users[0].email;
    await User.update({refreshToken: null}, {
        where: {
            email: email,
        },
    });
    res.clearCookie('refreshToken');
    return res.sendStatus(200); // OK
};

//function verify OTP user
export const verifyOTP = async (req, res) => {
    const { otp } = req.body;
    try {
        const user = await User.findOne({ where: {otp} });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.OTP !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Verifikasi berhasil, update status verifikasi pengguna
        await user.update({ OTP: null}); // Bersihkan OTP setelah verifikasi

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Verification Unsuccessful', error: error.message });
    }
};

//function detail user
export const detail = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const users = await User.findOne({
            where: {
                refreshToken: refreshToken
            }
        });
        const address = await Address.findOne({
            where: {
                user_id: users.id
            }
        });
        const response = {
            username: users.username,
            no_hp: users.no_hp,
            email: users.email,
            address: address.address,
            profile_foto: users.profile_foto,
        };
        res.status(200).json(response);
    } catch (error) {
        res.json({ message: error });
    }
};

//function update user
export const update = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const user = await User.findOne({
            where: {
                refreshToken: refreshToken
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { username,  no_hp, email, profile_foto } = req.body;
        const updatedUser = await user.update({
            username,
            no_hp,
            email,
            profile_foto
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//function forgot password to send email to user
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: false,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'Forgot Password',
            text: `link Ubah Password http://localhost:3000/changePassword`,  // Pastikan 'text' menggunakan huruf kecil
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return res.status(500).json({ message: 'User created, but email not sent', error: emailError.message });
        }

    } catch (error) {
        console.error('Error forgot password:', error);
        res.status(500).json({ message: 'Forgot Password Unsuccessful', error: error.message });
    }
};

//function change password
//test push
export const changePassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const updatedUser = await user.update({
            password: hashedPassword
        });
        res.status(200).json(updatedUser);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//function add address
export const addAddress = async (req, res) => {
    const { user_id, address } = req.body;
    try {
        const newAddress = await Address.create({
            user_id,
            address,
        });
        res.status(200).json(newAddress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//function delete address
export const deleteAddress = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const user = await User.findOne({ where: { refreshToken: refreshToken } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const address = await Address.findOne({ where: { user_id: user.id } });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        await address.destroy();
        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//update address
export const updateAddress = async (req, res) => {
    const { newAddress } = req.body;
    try {
        const refreshToken = req.cookies.refreshToken;
        const user = await User.findOne({ where: { refreshToken: refreshToken } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const address = await Address.findOne({ where: { user_id: user.id } });
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }
        const updatedAddress = await address.update({ address: newAddress });
        res.status(200).json(updatedAddress);
    }catch (error) {
        res.status(500).json({ message: error.message });
    }
};

