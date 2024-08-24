import User from '../model/userModel.js';
import Cart from '../model/cartModel.js';
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
