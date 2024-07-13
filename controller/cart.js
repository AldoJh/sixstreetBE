import User from "../model/userModel.js";
import Cart from "../model/cartModel.js";

export const getCart = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id } });
        const cart = await Cart.findAll({ where: { user_id: user.id } });
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addToCart = async (req, res) => { 
    const id = req.params.id;
    const { product_id, quantity, price, name, size } = req.body;
    try {
        const user = await User.findOne({ where: { id: id } });
        const cart = await Cart.create({ user_id: user.id, product_id, quantity, price, name, size, total: quantity * price });
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//update cart
export const updateCart = async (req, res) => {
    const { id } = req.params;
    const { quantity, price, name, size } = req.body;
    try {
        const cart = await Cart.findOne({ where: { id: id } });
        if(!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const updatedCart = await Cart.update({ quantity, price, name, size, total: quantity * price }, { where: { id: cart.id } });
        res.status(200).json({message: 'Cart updated'});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//delete cart
export const deleteCart = async (req, res) => {
    const { id } = req.params;
    try {
        const cart = await Cart.findOne({ where: { id: id } });
        if(!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        await Cart.destroy({ where: { id: cart.id } });
        res.status(200).json({ message: 'Cart deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};