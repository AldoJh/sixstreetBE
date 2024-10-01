import EmailModel from '../model/emailModel.js'; // Ganti nama 'email' menjadi 'EmailModel'
import nodemailer from 'nodemailer';

// Generate random password
const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

export const sendEmail = async (req, res) => { // Tambahkan req dan res sebagai argumen
  const { email } = req.body; // Ambil email dari req.body

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Generate a random password
    const randomPassword = generateRandomString(8); // Menggunakan panjang 8 karakter

    // Simpan email dan password ke dalam database
    const newEmail = await EmailModel.create({
      email: email,
      password: randomPassword,
    });

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email options
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
            <h2>Welcome!</h2>
            <p>Your temporary password is: <strong>${randomPassword}</strong></p>
            <p>We’ll be back soon!</p>
          </main>
          <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <p>Thank you for choosing SIXSTREET</p>
          </footer>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(welcomeMailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

export const cek_password = async (req, res) => { 
  const { password } = req.body; 

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const email = await EmailModel.findOne({ where: { password: password } });
    if (!email) {
      return res.status(404).json({ message: 'Password not found' });
    }
    res.status(200).json({ message: 'Password found' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to find password', error: error.message });
  }
}