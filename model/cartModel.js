import { Sequelize } from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const { DataTypes } = Sequelize;

User.associate = (models) => {
  User.hasOne(models.Cart, { foreignKey: 'user_id' });
};
const Cart = db.define(
  'Cart',
  {
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id',
      },
    },
    product_id: {
      type: DataTypes.INTEGER,
    },
    quantity: {
      type: DataTypes.INTEGER,
    },
    price: {
      type: DataTypes.INTEGER,
    },
    name: {
      type: DataTypes.STRING,
    },
    size: {
      type: DataTypes.STRING,
    },
    total: {
      type: DataTypes.INTEGER,
    },
  },
  {
    freezeTableName: true,
  }
);

Cart.associate = (models) => {
  Cart.belongsTo(models.User, { foreignKey: 'user_id' });
};

export default Cart;
