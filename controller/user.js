import User from "../model/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
    const {username, password, no_hp, email, address, referd_kode} = req.body;
    try {
        // Cek apakah username sudah terdaftar
        const existingUser = await User.findOne({ where: { username } });
        // Jika username sudah ada, kirim pesan kesalahan
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
            username : username,
            password : hashedPassword,
            no_hp : no_hp,
            email : email,
            address : address,
            referd_kode : referd_kode,
            role : 0,
            membership : 0,
            kode_user : generateRandomString(5),
        });

        // Kirim respons sukses
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        // Tangani kesalahan
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Register Unsuccessfully' });
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
