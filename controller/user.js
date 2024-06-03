import User from "../model/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

const generateOTP = (length) => {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

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



export const login = async (req, res) => {
    try{
        const user = await User.findAll({ 
            where: {
                email: req.body.email,
            },
        });
        const match = await bcrypt.compare(req.body.password, user[0].password);
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
    } catch (error){
        console.error('Error login:', error);
        res.status(500).json({ message: 'email not register' });
    }

};

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

