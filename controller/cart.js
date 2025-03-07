import User from '../model/userModel.js';
import Cart from '../model/cartModel.js';
import Voucher from '../model/VoucherModel.js';
import { Op } from 'sequelize'; // Import Sequelize operators
import NodeCache from 'node-cache';
import axios from 'axios';

// Inisialisasi cache dengan waktu kedaluwarsa (misalnya, 1 menit)
const cache = new NodeCache({ stdTTL: 60 }); // Cache berlaku selama 60 detik

// Get Cart by user_id
export const getCart = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  const cachedCart = cache.get(user_id);

  if (cachedCart) {
    return res.json(cachedCart);
  }

  try {
    const cart = await Cart.findAll({ where: { user_id } });
    const response = cart.map((item) => {
      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product_price: item.price,
        product_name: item.name,
        product_size: item.size,
        total: item.total,
      };
    });
    if (!cart.length) {
      return res.status(200).json([]);
    }
    cache.set(user_id, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

// Add to Cart
export const addToCart = async (req, res) => {
  const { user_id } = req.params;
  const { product_id, quantity, price, name, size } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  if (!product_id || !quantity || !price || !name) {
    return res.status(400).json({ message: 'Missing required fields: product_id, quantity, price, name' });
  }

  const total = quantity * price;

  try {
    const cart = await Cart.create({ user_id, product_id, quantity, price, name, size, total });

    cache.del(user_id);

    res.status(201).json({
      message: 'Cart item added successfully',
      data: cart,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};

// Update Cart
export const updateCart = async (req, res) => {
  const { user_id, id } = req.params;
  const { product_id, quantity, price, name, size } = req.body;

  if (!user_id || !id) {
    return res.status(400).json({ message: 'User ID and Cart ID are required' });
  }

  if (!product_id || !quantity || !price || !name) {
    return res.status(400).json({ message: 'Missing required fields: product_id, quantity, price, name' });
  }

  const total = quantity * price;

  try {
    const cart = await Cart.findOne({ where: { user_id, id } });

    if (!cart) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cart.update({ product_id, quantity, price, name, size, total });

    // Invalidasi cache setelah pembaruan item di keranjang
    cache.del(user_id);

    res.status(200).json({ message: 'Cart item updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating cart item', error: error.message });
  }
};

// Delete Cart Item
export const deleteCart = async (req, res) => {
  const { user_id, id } = req.params;

  if (!user_id || !id) {
    return res.status(400).json({ message: 'User ID and Cart ID are required' });
  }

  try {
    const cart = await Cart.findOne({ where: { user_id, id } });

    if (!cart) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cart.destroy();

    // Invalidasi cache setelah penghapusan item di keranjang
    cache.del(user_id);

    res.status(200).json({ message: 'Cart item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting cart item', error: error.message });
  }
};

// Delete All Cart Items
export const deleteAllCart = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    await Cart.destroy({ where: { user_id } });

    // Invalidasi cache setelah penghapusan semua item di keranjang
    cache.del(user_id);

    res.status(200).json({ message: 'All cart items deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting cart items', error: error.message });
  }
};

// Implement voucher
export const implement_voucher = async (req, res) => {
  const { product_id, price } = req.body;
  const { user_id } = req.params;

  // Daftar produk untuk kategori
  const apparel = [18215, 18218, 18210, 18216, 18199, 18198, 18209, 18217, 18200];
  const sneakers = [5472, 999, 1013, 12780, 12803, 1027, 18710, 7545, 17895];
  const accessories = [7339, 7340, 17860, 1147, 7332, 1143, 10217, 36, 5516];

  try {
    // Login untuk mendapatkan token
    const loginResponse = await axios.post('https://api2.jubelio.com/login', {
      email: 'rinaldiihsan0401@gmail.com',
      password: 'teamWeb2!',
    });

    if (loginResponse.status !== 200) {
      return res.status(401).json({ message: 'Gagal login ke API Jubelio.' });
    }

    if (!loginResponse.data.token) {
      return res.status(401).json({ message: 'Token tidak ditemukan setelah login ke API Jubelio.' });
    }

    const token = loginResponse.data.token;

    // Ambil data produk
    const productResponse = await axios.get(`https://api2.jubelio.com/inventory/items/${product_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (productResponse.status !== 200) {
      return res.status(404).json({ message: 'Gagal mengambil data produk dari API Jubelio.' });
    }

    const productData = productResponse.data;
    const category_id = productData.item_category_id;

    // Validasi kategori
    let category = '';
    if (apparel.includes(category_id)) {
      category = 'apparel';
    } else if (sneakers.includes(category_id)) {
      category = 'sneakers';
    } else if (accessories.includes(category_id)) {
      category = 'accessories';
    }

    // Cek sixstreet
    if (category && category.toLowerCase().includes('sixstreet')) {
      return res.status(400).json({ message: 'Kategori tidak dapat menggunakan voucher karena mengandung "sixstreet".' });
    }

    // Cari voucher
    const voucher = await Voucher.findOne({
      where: {
        user_id: user_id,
        isUsed: false,
        validUntil: { [Op.gte]: new Date() },
        applicableProducts: category,
      },
    });

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher yang valid untuk kategori ini tidak ditemukan.' });
    }

    // Hitung diskon
    const discountPercentage = voucher.discountPercentage;
    const discountAmount = (price * discountPercentage) / 100;
    const finalPrice = price - discountAmount;

    // Update voucher isUsed dan product_id
    await Promise.all([
      voucher.update({
        product_id: product_id,
        isUsed: true,
      }),
      Voucher.update({ isUsed: 1 }, { where: { product_id } }),
    ]);

    return res.status(200).json({
      message: 'Voucher berhasil diterapkan',
      originalPrice: price,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    });
  } catch (error) {
    console.error('Error applying voucher:', error);
    res.status(500).json({ message: 'Error applying voucher', error: error.message });
  }
};

// Implement voucher SIXSTREET
export const implement_voucher_sixstreet = async (req, res) => {
  const { product_id, price } = req.body;
  const { user_id } = req.params;

  try {
    // Mencari voucher spesifik untuk Sixstreet
    const voucher = await Voucher.findOne({
      where: {
        user_id: user_id,
        isUsed: false,
        validUntil: { [Op.gte]: new Date() },
        applicableProducts: 'sixstreet',
      },
    });

    if (!voucher) {
      return res.status(404).json({
        message: 'Voucher yang valid untuk Sixstreet tidak ditemukan.',
      });
    }

    // Hitung diskon dan harga akhir
    const discountPercentage = voucher.discountPercentage;
    const discountAmount = (price * discountPercentage) / 100;
    const finalPrice = price - discountAmount;

    // Update voucher
    await Promise.all([
      voucher.update({
        product_id: product_id,
        isUsed: true,
      }),
      Voucher.update({ isUsed: 1 }, { where: { product_id } }),
    ]);

    return res.status(200).json({
      message: 'Voucher Sixstreet berhasil diterapkan',
      originalPrice: price,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    });
  } catch (error) {
    console.error('Error detail:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: 'Error applying Sixstreet voucher',
      error: error.message,
    });
  }
};
