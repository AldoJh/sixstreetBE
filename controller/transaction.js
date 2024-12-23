import Midtrans from 'midtrans-client';
import Transaction from '../model/transactionModel.js';
import Cart from '../model/cartModel.js';
import Voucher from '../model/VoucherModel.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { where } from 'sequelize';
dotenv.config();

const cache = new NodeCache({ stdTTL: 60 });

// Get All Transactions
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll();
    if (!transactions.length) {
      return res.status(404).json({ message: 'Transaction is empty or not found' });
    }
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

// Get Transaction by user_id
export const getTransaction = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const transactions = await Transaction.findAll({ where: { user_id } });
    if (transactions.length === 0) {
      console.log('Transaction is empty or not found');
      return res.status(200).json([]);
    }
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
};

// Get Transaction by user_id and uuid
export const getTransactionByUuid = async (req, res) => {
  const { user_id, transaction_uuid } = req.params;

  if (!user_id || !transaction_uuid) {
    return res.status(400).json({ message: 'User ID and UUID are required' });
  }

  try {
    // Mengambil semua transaksi dengan user_id dan transaction_uuid yang cocok
    const transactions = await Transaction.findAll({
      where: { user_id, transaction_uuid },
    });

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
};

// Create Transaction
export const createTransaction = async (req, res) => {
  const { user_id, name, address } = req.body;

  if (!user_id || !name || !address) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Ambil semua item dari cart untuk user
    const cartItems = await Cart.findAll({ where: { user_id } });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    // Generate UUID untuk transaksi
    const transactionUuid = uuidv4();

    // Hitung total dari semua item di cart
    const totalAmount = cartItems.reduce((total, item) => {
      const price = parseFloat(item.price); // Pastikan price adalah angka
      const quantity = parseInt(item.quantity, 10); // Pastikan quantity adalah angka
      return total + price * quantity;
    }, 0);

    // Buat data transaksi dari item cart
    const transactions = cartItems.map((item) => ({
      transaction_uuid: transactionUuid,
      user_id,
      name,
      address,
      product_id: item.product_id,
      product_name: item.name,
      product_price: item.price,
      product_size: item.size,
      quantity: item.quantity,
      total: totalAmount, // Total keseluruhan untuk transaksi ini
      status: 'PENDING',
    }));

    // Insert semua transaksi dalam batch
    await Transaction.bulkCreate(transactions);

    res.status(200).json({ message: 'Checkout successful', transaction_uuid: transactionUuid });
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ message: 'Error during checkout', error: error.message });
  }
};

// Update Transaction
export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { user_id, name, address, product_id, quantity, product_price, product_name, product_size, total, status } = req.body;

  if (!user_id || !name || !address || !product_id || !quantity || !product_price || !product_name || !product_size || !total || !status) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const transaction = await Transaction.update({ user_id, name, address, product_id, quantity, product_price, product_name, product_size, total, status }, { where: { id } });
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating transaction', error: error.message });
  }
};

// Delete Transaction
export const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    await Transaction.destroy({ where: { id } });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
};

// Payment Gateway
let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export const paymentGateway = async (req, res) => {
  const { transaction_id, name, address, items, shipping_cost } = req.body;
  // Hitung subtotal dengan quantity yang benar
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal + (parseInt(shipping_cost) || 0);

  console.log('Received request body:', req.body);

  if (!transaction_id || !items || !items.length) {
    console.error('Missing required fields');
    return res.status(400).json({ message: 'Transaction ID, total, and items are required' });
  }

  try {
    const parameter = {
      transaction_details: {
        order_id: transaction_id,
        gross_amount: total,
      },
      item_details: [
        // Product items dengan quantity sesuai
        ...items.map((item) => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity, // Quantity dari masing-masing item
          name: item.name,
        })),
        // Shipping cost
        {
          id: 'SHIPPING_COST',
          price: parseInt(shipping_cost) || 0,
          quantity: 1, // Shipping cost tetap quantity 1
          name: 'Biaya Pengiriman',
        },
      ],
      customer_details: {
        first_name: name,
      },
    };

    const transactionToken = await snap.createTransaction(parameter);
    res.status(200).json(transactionToken);
  } catch (error) {
    console.error('Error generating transaction token:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : undefined,
    });

    res.status(500).json({ message: 'Error generating transaction token', error: error.message });
  }
};

const updateStatusBaseOnMidtransResponse = async (transaction_uuid, data) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const hash = crypto.createHash('sha512').update(`${transaction_uuid}${data.status_code}${data.gross_amount}${serverKey}`).digest('hex');

  if (data.signature_key !== hash) {
    return {
      status: 'error',
      message: 'Invalid Signature Key',
    };
  }

  let transactionStatus = data.transaction_status;
  let fraudStatus = data.fraud_status;
  let updatedTransaction = null;

  try {
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        updatedTransaction = await Transaction.update({ status: 'PAID' }, { where: { transaction_uuid } });
        const product = await Transaction.findOne({ where: { transaction_uuid } });
        const product_id = product ? product.product_id : null;
        const updateVoucher = await Voucher.update(
          { isUsed: 1 },
          { where: { product_id } }
        );
      }
    } else if (transactionStatus === 'settlement') {
      updatedTransaction = await Transaction.update({ status: 'PAID' }, { where: { transaction_uuid } });
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      updatedTransaction = await Transaction.update({ status: 'CANCELED' }, { where: { transaction_uuid } });
    } else if (transactionStatus === 'pending') {
      updatedTransaction = await Transaction.update({ status: 'PENDING' }, { where: { transaction_uuid } });
    }

    return {
      status: 'success',
      data: updatedTransaction
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to update transaction status: ${error.message}`,
    };
  }
};

export const transactionNotification = async (req, res) => {
  const data = req.body;

  try {
    const transaction = await Transaction.findOne({
      where: { transaction_uuid: data.order_id },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const result = await updateStatusBaseOnMidtransResponse(data.order_id, data);

    if (result.status === 'error') {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Transaction status updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: `Error processing notification: ${error.message}`,
    });
  }
};
