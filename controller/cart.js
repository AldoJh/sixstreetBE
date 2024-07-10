import User from "../model/userModel.js";

export const getCart = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.params.id } });
        const cart = await user.getCart();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};