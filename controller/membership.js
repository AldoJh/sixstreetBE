import User from '../model/userModel.js';
import Transaction from '../model/transactionModel.js';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';

// Helper Functions
const calculatePoints = (purchaseAmount) => {
  return Math.floor(purchaseAmount / 100000);
};

const calculatePointValue = (points) => {
  return points * 1000;
};

// Get user's membership status and points
export const getMembershipStatus = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findOne({
      where: { id: user_id },
      attributes: ['id', 'fullName', 'membership_points', 'points_expiration', 'total_points_earned', 'total_points_used', 'total_spent'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate points value in Rupiah
    const pointsValue = calculatePointValue(user.membership_points || 0);

    res.status(200).json({
      user_id: user.id,
      fullName: user.fullName,
      current_points: user.membership_points || 0,
      points_value_idr: pointsValue,
      total_points_earned: user.total_points_earned || 0,
      total_points_used: user.total_points_used || 0,
      total_spent: user.total_spent || 0,
      points_expiration: user.points_expiration,
      membership_level: user.membership,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching membership status',
      error: error.message,
    });
  }
};

// Use points for payment
export const redeemPoints = async (req, res) => {
  const { user_id, points_to_use, transaction_uuid } = req.body;

  try {
    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Pastikan user punya points yang cukup
    const currentPoints = user.membership_points || 0;
    if (currentPoints < points_to_use) {
      return res.status(400).json({
        message: 'Insufficient points',
        available_points: currentPoints,
      });
    }

    // Check if points are expired
    if (user.points_expiration && new Date() > new Date(user.points_expiration)) {
      return res.status(400).json({ message: 'Points have expired' });
    }

    const transaction = await Transaction.findOne({
      where: { transaction_uuid },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const pointValue = calculatePointValue(points_to_use);
    const finalAmount = transaction.total - pointValue;

    // Hitung sisa points yang valid
    const remainingPoints = currentPoints - points_to_use;
    if (remainingPoints < 0) {
      return res.status(400).json({
        message: 'Invalid points calculation',
        current_points: currentPoints,
        points_to_use: points_to_use,
      });
    }

    // Update user's points
    await user.update({
      membership_points: remainingPoints,
      total_points_used: (user.total_points_used || 0) + points_to_use,
    });

    // Update transaction
    await transaction.update({
      points_used_in_transaction: points_to_use,
      points_discount_amount: pointValue,
      final_amount: finalAmount,
    });

    res.status(200).json({
      message: 'Points redeemed successfully',
      points_used: points_to_use,
      discount_amount: pointValue,
      final_amount: finalAmount,
      remaining_points: remainingPoints,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error processing points redemption',
      error: error.message,
    });
  }
};

// Process points for completed transaction
// Di processTransactionPoints
export const processTransactionPoints = async (req, res) => {
  const { transaction_uuid } = req.params;

  try {
    const transaction = await Transaction.findOne({
      where: { transaction_uuid },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findOne({
      where: { id: transaction.user_id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert total to integer by removing decimal points
    const totalAmount = Math.round(transaction.total);

    // Calculate points from integer amount
    const pointsEarned = Math.floor(totalAmount / 100000);
    const currentPoints = user.membership_points || 0;
    const newTotalPoints = currentPoints + pointsEarned;

    // Update user with integer values
    await user.update({
      membership_points: newTotalPoints,
      points_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      last_point_update: new Date(),
      total_points_earned: (user.total_points_earned || 0) + pointsEarned,
      total_spent: Math.round((user.total_spent || 0) + totalAmount),
    });

    // Update transaction
    await transaction.update({
      points_earned: pointsEarned,
    });

    res.status(200).json({
      message: 'Points processed successfully',
      transaction_details: {
        transaction_uuid,
        status: transaction.status,
        total_amount: totalAmount,
        points_earned: pointsEarned,
      },
      user_points: {
        previous_points: currentPoints,
        points_earned: pointsEarned,
        current_points: newTotalPoints,
      },
    });
  } catch (error) {
    console.error('Error processing points:', error);
    res.status(500).json({
      message: 'Error processing points',
      error: error.message,
    });
  }
};

// Get points transaction history
export const getPointsHistory = async (req, res) => {
  const { user_id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;

    const transactions = await Transaction.findAndCountAll({
      where: {
        user_id,
        status: 'PAID',
        [Op.or]: [{ points_earned: { [Op.gt]: 0 } }, { points_used_in_transaction: { [Op.gt]: 0 } }],
      },
      attributes: ['transaction_uuid', 'points_earned', 'points_used_in_transaction', 'points_discount_amount', 'total', 'final_amount', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
    });

    res.status(200).json({
      total: transactions.count,
      current_page: parseInt(page),
      total_pages: Math.ceil(transactions.count / limit),
      transactions: transactions.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching points history',
      error: error.message,
    });
  }
};

// Send monthly points reminder email
export const sendMonthlyReminder = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        membership_points: {
          [Op.gt]: 0,
        },
      },
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    for (const user of users) {
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: 'Your SIXSTREET Membership Points Update',
        html: `
          <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
              <h1>SIXSTREET Membership Update</h1>
            </header>
            <main style="padding: 20px; background-color: #f9f9f9;">
              <h2>Hello ${user.fullName}!</h2>
              <p>Here's your current membership status:</p>
              <ul>
                <li>Current Points: ${user.membership_points}</li>
                <li>Points Value: Rp ${calculatePointValue(user.membership_points).toLocaleString('id-ID')}</li>
                <li>Points Expiration: ${new Date(user.points_expiration).toLocaleDateString('id-ID')}</li>
                <li>Total Points Earned: ${user.total_points_earned}</li>
                <li>Total Amount Spent: Rp ${Number(user.total_spent).toLocaleString('id-ID')}</li>
              </ul>
              <p>Don't forget to use your points on your next purchase!</p>
            </main>
            <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
              <p>Thank you for being a SIXSTREET member</p>
            </footer>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ message: 'Monthly reminders sent successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error sending monthly reminders',
      error: error.message,
    });
  }
};

// Helper function to send points update email
const sendPointsUpdateEmail = async (email, pointsEarned, totalPoints, expirationDate) => {
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
    subject: 'SIXSTREET Points Update',
    html: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <header style="text-align: center; padding: 10px; background-color: #333; color: white;">
          <h1>SIXSTREET Points Update</h1>
        </header>
        <main style="padding: 20px; background-color: #f9f9f9;">
          <h2>Congratulations! You've Earned New Points!</h2>
          <p>Points earned from this transaction: ${pointsEarned}</p>
          <p>Your current points balance: ${totalPoints}</p>
          <p>Points value: Rp ${calculatePointValue(totalPoints).toLocaleString('id-ID')}</p>
          <p>Points expiration date: ${expirationDate.toLocaleDateString('id-ID')}</p>
        </main>
        <footer style="text-align: center; padding: 10px; background-color: #333; color: white;">
          <p>Thank you for shopping at SIXSTREET</p>
        </footer>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
