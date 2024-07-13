import User from '../model/userModel.js';
import Address from '../model/addressModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

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
      attributes: ['id', 'username', 'no_hp', 'email', 'referd_kode', 'role', 'membership', 'kode_user'],
    });
    res.json(users);
  } catch (error) {
    res.json({ message: error });
  }
};

// Function register user
export const createUser = async (req, res) => {
  const { username, password, no_hp, email, referd_kode } = req.body;
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
      },
    });

    const otpMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is ${newUser.OTP}`, // Pastikan 'text' menggunakan huruf kecil
    };

    const welcomeMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Welcome in SIXSTREET',
      text: `Welcome ${username} in SIXSTREET! Thank you for registering at our service, Enjoy and Happy Shopping!.`,
    };

    try {
      // Mengirim email OTP
      await transporter.sendMail(otpMailOptions);
      console.log('OTP email sent successfully');

      // Mengirim email selamat datang
      await transporter.sendMail(welcomeMailOptions);
      console.log('Welcome email sent successfully');

      // Kirim respons sukses
      res.status(201).json({ message: 'User created successfully and emails sent', user: newUser });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ message: 'User created, but emails not sent', error: emailError.message });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Register Unsuccessfully', error: error.message });
  }
};

//function login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cari user berdasarkan email
    const user = await User.findOne({
      where: { email },
    });

    // Jika user tidak ditemukan
    if (!user) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    // Verifikasi password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    // Cek apakah user sudah terverifikasi (contoh: OTP)
    if (user.OTP !== null) {
      return res.status(400).json({ message: 'User not verified OTP' });
    }

    // Generate access token
    const accessToken = jwt.sign({ email: user.email, username: user.username }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '30m',
    });

    const detailData = {
      user_id: user.id,
    };

    // Kirim response dengan accessToken
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      maxAge: 30 * 60 * 1000,
    });

    res.status(200).json({ message: 'Login successfully', accessToken, detailData });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// function logout user
export const logout = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (token) {
      invalidatedTokens.push(token);
    }
    res.clearCookie('accessToken', { httpOnly: true });

    return res.status(200).json({ message: 'Logout successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

//function verify OTP user
export const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  try {
    const user = await User.findOne({ where: { otp } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.OTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Verifikasi berhasil, update status verifikasi pengguna
    await user.update({ OTP: null }); // Bersihkan OTP setelah verifikasi

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Verification Unsuccessful', error: error.message });
  }
};

//function detail user
export const detail = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const address = await Address.findOne({
      where: {
        user_id: user.id,
      },
    });

    const response = {
      message: {
        id: user.id,
        username: user.username,
        no_hp: user.no_hp,
        email: user.email,
        address: address ? address.address : null,
        profile_foto: user.profile_foto,
      },
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//function update user
export const update = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, no_hp, email, profile_foto } = req.body;
    await user.update({
      username,
      no_hp,
      email,
      profile_foto,
    });

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    const response = {
      message: {
        id: updatedUser.id,
        username: updatedUser.username,
        no_hp: updatedUser.no_hp,
        email: updatedUser.email,
        profile_foto: updatedUser.profile_foto,
      },
    };

    res.status(200).json(response);
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
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Forgot Password',
      text: `link Ubah Password http://localhost:3000/changePassword`, // Pastikan 'text' menggunakan huruf kecil
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
      password: hashedPassword,
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//function get address
export const getAddress = async (req, res) => {
  const { user_id } = req.params;
  try {
    const addresses = await Address.findAll({
      where: {
        user_id,
      },
    });
    const response = {
      addresses: addresses,
    };
    if (addresses.length > 0) {
      res.status(200).json(response);
    } else {
      res.status(404).json({ message: 'No addresses found for this user' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function untuk menambahkan alamat baru
export const addAddress = async (req, res) => {
  const { user_id } = req.params;
  const { address } = req.body;
  try {
    const newAddress = await Address.create({
      user_id,
      address,
    });
    res.status(200).json({ message: 'Address successfully added', newAddress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//function delete address
export const deleteAddress = async (req, res) => {
  const { user_id, id } = req.params;
  try {
    const address = await Address.findOne({ where: { user_id, id } });
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
  const { user_id, id } = req.params;
  const { newAddress } = req.body;
  try {
    const address = await Address.findOne({ where: { user_id, id } });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    const updatedAddress = await address.update({ address: newAddress });
    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
