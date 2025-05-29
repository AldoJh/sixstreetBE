import User from '../model/userModel.js';
import Address from '../model/addressModel.js';
import Voucher from '../model/VoucherModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import axios from 'axios';
import cron from 'node-cron';

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

// Function createUserVouchers - Updated voucher expiration
const createUserVouchers = async (userId) => {
  // Misalnya ada diskon yang diterapkan pada produk tertentu
  const discountableProducts = {
    apparel: {
      99000: [[18215], [18218, 18210, 18216], [18199]],
    },
    sneakers: {
      1500000: [
        [5472, 999, 1013, 12780],
        [1027, 18710],
      ],
    },
  };

  const discountPercentages = [10, 10]; // Misalnya 10%

  const vouchers = [];
  for (let category in discountableProducts) {
    const products = discountableProducts[category];
    for (let i = 0; i < products.length; i++) {
      const voucherCode = `VOUCHER-${category.toUpperCase()}-${i + 1}`;
      // FIXED: Set voucher to expire on December 31, 2025
      const validUntil = new Date('2025-12-31T23:59:59.999Z');

      // Membuat voucher
      const voucher = await Voucher.create({
        user_id: userId,
        code: voucherCode,
        discountPercentage: discountPercentages[i % discountPercentages.length],
        isUsed: false,
        validUntil,
        applicableProducts: products[i],
      });

      vouchers.push(voucher);
    }
  }

  return vouchers;
};

//function get semua data user
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'no_hp', 'email', 'referd_kode', 'role', 'membership', 'birthday', 'kode_user', 'createdAt', 'updatedAt'],
    });
    res.json(users);
  } catch (error) {
    res.json({ message: error });
  }
};

// Function register user
export const createUser = async (req, res) => {
  const { fullName, password, email, no_hp, birthday = '', referd_kode = '' } = req.body;

  try {
    // Cek apakah fullName sudah terdaftar
    const existingUser = await User.findOne({ where: { fullName } });
    if (existingUser) {
      return res.status(400).json({ message: 'fullName already exists' });
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

    // Jika fullName belum terdaftar, buat pengguna baru
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      fullName,
      password: hashedPassword,
      no_hp,
      email,
      referd_kode,
      birthday,
      role: 0,
      membership: 0,
      kode_user: generateRandomString(5),
      OTP: generateOTP(6),
    });

    // Setelah user dan voucher dibuat, kirim email secara terpisah
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
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap" rel="stylesheet">
          <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <h1 style="font-family: 'Cormorant Garamond', serif;">SIXSTREET</h1>
          </header>
          <main style="padding: 20px; background-color: #f9f9f9;">
            <h2>Your OTP Code</h2>
            <p>Your OTP code is: <strong>${newUser.OTP}</strong></p>
          </main>
          <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <p>Thank you for using SIXSTREET</p>
          </footer>
        </div>
      `,
    };

    const welcomeMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Welcome to SIXSTREET',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap" rel="stylesheet">
          <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <h1 style="font-family: 'Cormorant Garamond', serif;">Welcome to SIXSTREET</h1>
          </header>
          <main style="padding: 20px; background-color: #f9f9f9;">
            <h2>Welcome, ${fullName}!</h2>
            <p>Thank you for registering at SIXSTREET. Enjoy and happy shopping!</p>
          </main>
          <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <p>Thank you for choosing SIXSTREET</p>
          </footer>
        </div>
      `,
    };

    // Kirim email dengan handling error
    try {
      // Mengirim email OTP
      await transporter.sendMail(otpMailOptions);
      console.log('OTP email sent successfully');

      // Mengirim email selamat datang
      await transporter.sendMail(welcomeMailOptions);
      res.status(201).json('Successfully');
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
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
    const accessToken = jwt.sign({ email: user.email, fullName: user.fullName }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '50m',
    });

    const detailData = {
      user_id: user.id,
      role: user.role,
    };

    // Kirim response dengan accessToken
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      maxAge: 50 * 60 * 1000,
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

// Function verify OTP user
export const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  try {
    // Cari user berdasarkan OTP
    const user = await User.findOne({ where: { otp } });

    // Jika user tidak ditemukan
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cek apakah OTP valid
    if (user.OTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update OTP menjadi null setelah verifikasi
    await user.update({ OTP: null });

    const id = user.id;
    const discountableProducts = ['apparel', 'sneakers', 'Accessories', 'Sixstreet']; //category product nya
    const discountPercentages = [10, 10, 10, 50]; // Persentase diskon yang diterapkan

    const vouchers = [];

    for (let i = 0; i < discountableProducts.length; i++) {
      const category = discountableProducts[i];
      const discountPercentage = discountPercentages[i % discountPercentages.length];
      const voucherCode = `VOUCHER-${category.toUpperCase()}-${i + 1}-${id}`;

      // FIXED: Set voucher to expire on December 31, 2025
      const validUntil = new Date('2025-12-31T23:59:59.999Z');

      const voucher = await Voucher.create({
        user_id: id,
        code: voucherCode,
        discountPercentage,
        isUsed: false,
        validUntil,
        applicableProducts: category, // Menyimpan produk yang berlaku untuk voucher ini
      });
      vouchers.push(voucher);
    }

    // Kirim respons sukses beserta data voucher yang dibuat
    res.status(200).json({
      message: 'OTP verified successfully',
      vouchers, // Mengirimkan array vouchers yang berhasil dibuat
    });
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
        fullName: user.fullName,
        no_hp: user.no_hp,
        email: user.email,
        birthday: user.birthday,
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

    const { fullName, no_hp, email, birthday, profile_foto } = req.body;
    await user.update({
      fullName,
      no_hp,
      email,
      birthday,
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
        fullName: updatedUser.fullName,
        no_hp: updatedUser.no_hp,
        email: updatedUser.email,
        birthday: updatedUser.birthday,
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
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Arial', sans-serif; color: #333333; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px; padding: 20px; background-color: #333333; border-radius: 4px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">SIXSTREET</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px; line-height: 1.5;">Kami menerima permintaan untuk reset password akun Anda.</p>
            <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px; line-height: 1.5;">Untuk melanjutkan, silakan klik tombol di bawah ini:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://six6street.co.id/change-password" style="display: inline-block; padding: 12px 24px; background-color: #333333; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 16px;">Reset Password</a>
            </div>
            
            <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px; line-height: 1.5;">Jika Anda tidak meminta reset password, Anda dapat mengabaikan email ini dan tidak ada perubahan yang akan dibuat pada akun Anda.</p>
            
            <p style="margin-top: 0; margin-bottom: 15px; font-size: 16px; line-height: 1.5;">Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan menempelkan link berikut ke browser Anda:</p>
            
            <p style="margin-top: 0; margin-bottom: 15px; background-color: #eeeeee; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">
              https://six6street.co.id/change-password
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777777; font-size: 14px;">
            <p style="margin-top: 0; margin-bottom: 10px;">Email ini dikirim otomatis, mohon jangan balas.</p>
            <p style="margin-top: 0; margin-bottom: 10px;">&copy; ${new Date().getFullYear()} SIXSTREET. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
      // Menambahkan status 200 dan pesan sukses
      return res.status(200).json({ message: 'Email reset password berhasil dikirim' });
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

// Function to get address and user's name
export const getAddress = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const user = await User.findOne({
      where: { id: user_id },
      attributes: ['fullName'],
    });

    const addresses = await Address.findAll({
      where: { user_id },
      order: [['is_primary', 'DESC']],
    });

    if (!addresses.length) {
      return res.status(200).json({
        addresses: [],
        fullName: user ? user.fullName : null,
      });
    }

    const response = addresses.map((address) => ({
      ...address.toJSON(),
      fullName: user.fullName,
    }));

    res.status(200).json({
      addresses: response,
      fullName: user.fullName,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function untuk menambahkan alamat baru
export const addAddress = async (req, res) => {
  const { user_id } = req.params;
  const { province_id, province_name, city_id, city_name, city_type, subdistrict_id, subdistrict_name, kelurahan, detail_address, kodePos } = req.body;

  try {
    const existingAddressCount = await Address.count({ where: { user_id } });
    const is_primary = existingAddressCount === 0;

    if (is_primary) {
      await Address.update({ is_primary: false }, { where: { user_id, is_primary: true } });
    }

    const newAddress = await Address.create({
      user_id,
      province_id,
      province_name,
      city_id,
      city_name,
      city_type,
      subdistrict_id,
      subdistrict_name,
      kelurahan,
      detail_address,
      postal_code: kodePos,
      is_primary,
    });

    res.status(201).json({
      message: 'Address successfully added',
      newAddress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAddress = async (req, res) => {
  const { user_id, id } = req.params;
  const { province_id, province_name, city_id, city_name, city_type, subdistrict_id, subdistrict_name, kelurahan, detail_address, kodePos, is_primary } = req.body;

  try {
    const existingAddress = await Address.findOne({ where: { user_id, id } });

    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (is_primary) {
      await Address.update({ is_primary: false }, { where: { user_id, is_primary: true } });
    }

    const updatedAddress = await existingAddress.update({
      province_id,
      province_name,
      city_id,
      city_name,
      city_type,
      subdistrict_id,
      subdistrict_name,
      kelurahan,
      detail_address,
      postal_code: kodePos,
      is_primary: is_primary || existingAddress.is_primary,
    });

    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hapus alamat
export const deleteAddress = async (req, res) => {
  const { user_id, id } = req.params;

  try {
    const address = await Address.findOne({ where: { user_id, id } });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await address.destroy();

    // Jika alamat yang dihapus adalah alamat utama, pilih alamat pertama sebagai alamat utama
    const remainingAddresses = await Address.findAll({
      where: { user_id },
      order: [['createdAt', 'ASC']],
    });

    if (remainingAddresses.length > 0) {
      await remainingAddresses[0].update({ is_primary: true });
    }

    res.status(200).json({ message: 'Address successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fungsi login Jubelio untuk diekspor
// loginJubelio.js
export const loginJubelio = async (req, res) => {
  const email = 'rinaldiihsan0401@gmail.com'; // Email diambil dari environment variable
  const password = 'teamWeb2!'; // Password diambil dari environment variable

  try {
    // Kirim request login ke API Jubelio
    const response = await axios.post('https://api2.jubelio.com/login', {
      email: email,
      password: password,
    });

    // Ambil token dari response API
    const token = response.data.token;

    // Kirim token kembali ke client
    res.status(200).json({
      message: 'Login successful',
      token: token,
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      res.status(401).json({ message: 'Invalid email or password' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// Get all provinces
export const getProvinces = async (req, res) => {
  try {
    const response = await axios.get(`https://pro.rajaongkir.com/api/province`, {
      headers: {
        key: '25000b4f35959c8cee83658faa168a16',
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get all cities
export const getCities = async (req, res) => {
  try {
    const response = await axios.get(`	https://pro.rajaongkir.com/api/city`, {
      headers: {
        key: '25000b4f35959c8cee83658faa168a16',
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getSubdistricts = async (req, res) => {
  const { city_id } = req.params;

  try {
    const response = await axios.get(`https://pro.rajaongkir.com/api/subdistrict`, {
      params: { city: city_id },
      headers: {
        key: '25000b4f35959c8cee83658faa168a16',
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Calculate shipping cost
export const calculateCost = async (req, res) => {
  const { origin, destination, weight, courier } = req.body;

  try {
    const response = await axios.post(
      'https://pro.rajaongkir.com/api/cost',
      {
        origin: origin,
        originType: 'subdistrict',
        destination: destination,
        destinationType: 'subdistrict',
        weight: weight,
        courier: courier,
      },
      {
        headers: {
          key: '25000b4f35959c8cee83658faa168a16',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Function untuk mengirimkan email pengingat
export const sendEmailReminder = async (email, subject, text, fullName) => {
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
    subject: subject,
    html: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap" rel="stylesheet">
        <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
          <h1 style="font-family: 'Cormorant Garamond', serif;">${subject}</h1>
        </header>
        <main style="padding: 20px; background-color: #f9f9f9;">
          <h2>Dear ${fullName},</h2>
          <p>${text}</p>
        </main>
        <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
          <p>Thank you for choosing SIXSTREET</p>
        </footer>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Reminder email sent to:', email);
  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
};

// Reminder 1st: Kirim pengingat 7 hari setelah registrasi untuk menggunakan voucher
cron.schedule('0 0 7 * * *', async () => {
  try {
    const users = await User.findAll({
      where: {
        createdAt: {
          [Op.lte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Cek pengguna yang terdaftar lebih dari 7 hari
        },
      },
    });

    users.forEach(async (user) => {
      const vouchers = await Voucher.findAll({
        where: {
          user_id: user.id,
          isUsed: false,
        },
      });

      if (vouchers.length > 0) {
        // Kirim email pengingat
        await sendEmailReminder(user.email, 'Reminder: Gunakan Voucher Anda!', `Halo ${user.fullName}, Anda memiliki voucher yang belum digunakan. Segera gunakan sebelum kadaluarsa.`, user.fullName);
      }
    });
  } catch (error) {
    console.error('Error during the 1st reminder job:', error);
  }
});

// Reminder 2nd: Kirim pengingat 3 hari sebelum voucher kadaluarsa
cron.schedule('0 0 3 * * *', async () => {
  try {
    const currentDate = new Date();
    const expirationDate = new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 hari lagi

    const vouchers = await Voucher.findAll({
      where: {
        validUntil: {
          [Op.lte]: expirationDate,
        },
        isUsed: false,
      },
    });

    vouchers.forEach(async (voucher) => {
      const user = await User.findOne({
        where: {
          id: voucher.user_id,
        },
      });

      if (user) {
        // Kirim email pengingat tentang kadaluarsa voucher
        await sendEmailReminder(user.email, 'Reminder: Voucher Anda Segera Kadaluarsa', `Halo ${user.fullName}, Voucher Anda dengan kode ${voucher.code} akan kadaluarsa dalam 3 hari. Segera gunakan sebelum kadaluarsa!`, user.fullName);
      }
    });
  } catch (error) {
    console.error('Error during the 2nd reminder job:', error);
  }
});

// get all vouchers
export const getVouchers = async (req, res) => {
  const { user_id } = req.body;
  try {
    const vouchers = await Voucher.findAll({ where: { user_id } });
    res.status(200).json(vouchers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVoucherById = async (req, res) => {
  const { user_id } = req.params;
  try {
    const voucher = await Voucher.findAll({ where: { user_id } });
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function untuk newsletter dan ajakan registrasi (tanpa menyimpan ke database)
export const subscribeNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Cek apakah email sudah terdaftar sebagai user
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered as a user' });
    }

    // Kirim email ajakan pendaftaran
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Encode email untuk digunakan di URL
    const encodedEmail = encodeURIComponent(email);

    const invitationMailOptions = {
      from: `"SIXSTREET" <${process.env.EMAIL_USERNAME}>`, // Nama pengirim yang jelas
      to: email,
      subject: 'Your Special Welcome Gift from SIXSTREET',
      replyTo: process.env.EMAIL_USERNAME,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'High',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap" rel="stylesheet">
          <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <h1 style="font-family: 'Cormorant Garamond', serif;">SIXSTREET</h1>
          </header>
          
          <main style="padding: 20px; background-color: #f9f9f9; text-align: center;">
            <h2 style="font-size: 24px; color: #333; margin-bottom: 5px; text-align: center;">Welcome Gift Awaits You</h2>
            <p style="font-size: 16px; margin-top: 10px; margin-bottom: 20px; text-align: center;">Sign up and receive your first voucher</p>
            
            <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #d32f2f; font-size: 20px; margin: 5px 0; text-align: center;">Discount up to 50% OFF</h3>
              <p style="font-style: italic; font-size: 14px; text-align: center;">*minimum purchase of Rp 990.000</p>
            </div>
            
            <table role="presentation" style="margin: 30px auto; border-collapse: collapse;">
              <tr>
                <td style="background-color: #333; border-radius: 4px;">
                  <a href="http://localhost:5173/register?email=${encodedEmail}" 
                    style="background-color: #333; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
                    CLAIM NOW
                  </a>
                </td>
              </tr>
            </table>
            
            <!-- Tambahan konten legitimate -->
            <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 25px; text-align: left;">
              <p style="font-size: 14px; color: #666;">
                SIXSTREET is a premium fashion destination offering the latest trends in apparel, 
                footwear, and accessories. With our curated collections and exclusive brands, 
                we help you express your unique style.
              </p>
            </div>
          </main>
          
          <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <p style="margin-bottom: 10px; color: #f0f0f0">© ${new Date().getFullYear()} SIXSTREET. All rights reserved.</p>
            
            <!-- Social media links (placeholder) -->
            <div style="margin: 10px 0;">
              <a href="https://facebook.com/sixstreet" style="color: white; margin: 0 5px; text-decoration: none;">Facebook</a> |
              <a href="https://instagram.com/sixstreet" style="color: white; margin: 0 5px; text-decoration: none;">Instagram</a> |
              <a href="https://twitter.com/sixstreet" style="color: white; margin: 0 5px; text-decoration: none;">Twitter</a>
            </div>
            
            <p style="font-size: 11px; color: #aaa; margin-top: 10px;">
              You received this email because you expressed interest in SIXSTREET offers and products.
            </p>
          </footer>
        </div>
      `,
    };

    try {
      // Kirim email ajakan
      await transporter.sendMail(invitationMailOptions);
      console.log('Newsletter invitation email sent successfully to:', email);
      res.status(200).json({ message: 'Invitation email sent successfully!' });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      res.status(500).json({ message: 'Failed to send invitation email', error: emailError.message });
    }
  } catch (error) {
    console.error('Error in newsletter subscription:', error);
    res.status(500).json({ message: 'Subscription failed', error: error.message });
  }
};
