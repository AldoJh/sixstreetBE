import User from "../model/userModel.js";
import bcrypt from "bcrypt";

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
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
            kode_user : Math.floor(Math.random() * 100000),
        });

        // Kirim respons sukses
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        // Tangani kesalahan
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
    
}