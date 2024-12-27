import User from '../model/userModel.js';
import Cart from '../model/cartModel.js';
import Voucher from '../model/VoucherModel.js';
import { Op } from 'sequelize';  // Import Sequelize operators
import NodeCache from 'node-cache';

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

  // Daftar produk untuk kategori apparel
  const apparel = [
    18215, 18218, 18210, 18216,
    18199, 18198, 18209, 18217,
    8200
  ];

  // Daftar produk untuk kategori sneakers
  const sneakers = [
    5472, 999, 1013, 12780, 12803,
    1027, 18710, 7545, 17895, 1013,
    12794, 7560, 7545, 17895, 1013
  ];

  const Accessories = [
    7339, 7340, 17860, 1147, 7332,
    1143, 10217, 36, 5516, 10230, 
    12622, 12628, 12632, 15320, 
    18225, 2835, 10222, 12621, 
    12626, 12631, 24806, 24807, 
    1149, 12610, 12611, 10219, 17866, 
    1139, 1137, 12432, 5429
  ];

  try {
    let voucher;

    // Mengecek apakah product_id ada di kategori apparel dan harga lebih dari 990000
    if (apparel.includes(product_id)) {
      if (price <= 990000) {
        return res.status(400).json({ message: 'Price must be greater than 990000 for apparel products.' });
      }
      
      // Menggunakan Op.like untuk memeriksa apakah kategori "apparel" ada dalam JSON
      voucher = await Voucher.findOne({
        where: {
          user_id: user_id,  // Memastikan voucher untuk user ini
          applicableProducts: { [Op.like]: '%"apparel"%' },  // Mencari apakah "apparel" ada dalam kolom JSON
          isUsed: false,  // Voucher harus belum digunakan
          validUntil: { [Op.gte]: new Date() }  // Voucher harus masih berlaku
        }
      });
    }

    // Jika voucher tidak ditemukan di apparel, cek di sneakers dan harga lebih dari 1500000
    if (!voucher && sneakers.includes(product_id)) {
      if (price <= 1500000) {
        return res.status(400).json({ message: 'Price must be greater than 1500000 for sneakers products.' });
      }

      // Menggunakan Op.like untuk memeriksa apakah kategori "sneakers" ada dalam JSON
      voucher = await Voucher.findOne({
        where: {
          user_id: user_id,  // Memastikan voucher untuk user ini
          applicableProducts: { [Op.like]: '%"sneakers"%' },  // Mencari apakah "sneakers" ada dalam kolom JSON
          isUsed: false,  // Voucher harus belum digunakan
          validUntil: { [Op.gte]: new Date() }  // Voucher harus masih berlaku
        }
      });
    }

    if (!voucher && Accessories.includes(product_id)) {
      if (price <= 990000) {
        return res.status(400).json({ message: 'Price must be greater than 1500000 for sneakers products.' });
      }

      // Menggunakan Op.like untuk memeriksa apakah kategori "sneakers" ada dalam JSON
      voucher = await Voucher.findOne({
        where: {
          user_id: user_id,  // Memastikan voucher untuk user ini
          applicableProducts: { [Op.like]: '%"Accessories"%' },  // Mencari apakah "sneakers" ada dalam kolom JSON
          isUsed: false,  // Voucher harus belum digunakan
          validUntil: { [Op.gte]: new Date() }  // Voucher harus masih berlaku
        }
      });
    }
    // Jika voucher tidak ditemukan di kedua kategori
    if (!voucher) {
      return res.status(404).json({ message: 'No valid voucher found for this product' });
    }

    // Mengambil discountPercentage dari voucher yang ditemukan
    const discountPercentage = voucher.discountPercentage;

    // Menghitung diskon dan harga akhir
    const discountAmount = (price * discountPercentage) / 100;
    const finalPrice = price - discountAmount;

    //update table voucher with product_id 
    await voucher.update({
      product_id: product_id, 
    });

    // Kirimkan respons sukses dengan harga setelah diskon
    return res.status(200).json({
      message: 'Voucher applied successfully',
      originalPrice: price,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    });
  } catch (error) {
    console.error('Error applying voucher:', error);
    res.status(500).json({ message: 'Error applying voucher', error: error.message });
  }
};

