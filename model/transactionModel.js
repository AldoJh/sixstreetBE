import { Sequelize } from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const { DataTypes } = Sequelize;
User.associate = (models) => {
  User.hasOne(models.Cart, { foreignKey: 'user_id' });
};
const Transaction = db.define(
  'Transaction',
  {
    transaction_uuid: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    product_id: {
      type: DataTypes.INTEGER,
    },
    quantity: {
      type: DataTypes.INTEGER,
    },
    product_price: {
      type: DataTypes.INTEGER,
    },
    product_name: {
      type: DataTypes.STRING,
    },
    product_size: {
      type: DataTypes.STRING,
    },
    total: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: true,
  }
);

Transaction.associate = (models) => {
  Transaction.belongsTo(models.User, { foreignKey: 'user_id' });
};

export default Transaction;
