// Model Voucher
import { Sequelize } from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const { DataTypes } = Sequelize;

const Voucher = db.define(
  'Voucher', 
  {
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    discountPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    validUntil: {
      type: DataTypes.DATE
    },
    applicableProducts: {
      type: DataTypes.STRING
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
  }
);

// Relasi antara User dan Voucher
Voucher.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Voucher, { foreignKey: 'user_id' });

export default Voucher;
