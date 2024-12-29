import { Sequelize } from 'sequelize';
import db from '../config/database.js';

const { DataTypes } = Sequelize;

const User = db.define(
  'User',
  {
    fullName: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    no_hp: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    profile_foto: {
      type: DataTypes.STRING,
    },
    membership: {
      type: DataTypes.INTEGER,
    },
    birthday: {
      type: DataTypes.DATE,
    },
    kode_user: {
      type: DataTypes.STRING,
    },
    referd_kode: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.INTEGER,
    },
    refreshToken: {
      type: DataTypes.TEXT,
    },
    OTP: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: true,
  }
);
User.associate = (models) => {
  User.hasOne(models.Cart, { foreignKey: 'user_id' });
};
User.associate = (models) => {
  User.has(models.Voucher, { foreignKey: 'user_id' });
};

export default User;
