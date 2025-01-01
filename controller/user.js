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
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Kadaluarsa 30 hari

      // Membuat voucher
      const voucher = await Voucher.create({
        user_id: userId,
        code: voucherCode,
        discountPercentage: discountPercentages[i % discountPercentages.length],
        isUsed: false,
        validUntil,
        applicableProducts: JSON.stringify(products[i]),
      });

      vouchers.push(voucher);
    }
  }

  return vouchers; // Pastikan untuk mengembalikan array vouchers
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

      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Kadaluarsa 30 hari

      const voucher = await Voucher.create({
        user_id: id,
        code: voucherCode,
        discountPercentage,
        isUsed: false,
        validUntil,
        applicableProducts: JSON.stringify([category]), // Menyimpan produk yang berlaku untuk voucher ini
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
