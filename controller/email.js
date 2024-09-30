import EmailModel from '../model/emailModel.js'; // Ganti nama 'email' menjadi 'EmailModel'
import nodemailer from 'nodemailer';

export const sendEmail = async (req, res) => { // Tambahkan req dan res sebagai argumen
  const { email } = req.body; // Ambil email dari req.body dan ganti nama variabel agar tidak konflik

  try {
    const newEmail = await EmailModel.create({ // Gunakan EmailModel agar tidak konflik
      email: email,
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const welcomeMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Maintenance',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond&display=swap" rel="stylesheet">
          <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <h1 style="font-family: 'Cormorant Garamond', serif;">Welcome to SIXSTREET</h1>
          </header>
          <main style="padding: 20px; background-color: #f9f9f9;">
            <h2>Welcome !</h2>
            <p>Site Undergoing Maintenance!</p>
            <p>We’ll Be Back Soon!</p>
          </main>
          <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
            <p>Thank you for choosing SIXSTREET</p>
          </footer>
        </div>
      `,
    };

    await transporter.sendMail(welcomeMailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};
