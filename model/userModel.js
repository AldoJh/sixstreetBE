import { Sequelize } from 'sequelize';
import db from '../config/database.js';

const { DataTypes } = Sequelize;

const User = db.define(
  'User',
  {
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    no_hp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    profile_foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    membership: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    birthday: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kode_user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referd_kode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    OTP: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    membership_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    points_expiration: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_point_update: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total_spent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    total_points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    total_points_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
  }
);

User.associate = (models) => {
  User.hasOne(models.Cart, { foreignKey: 'user_id' });
  User.hasMany(models.Voucher, { foreignKey: 'user_id' });
  User.hasMany(models.Transaction, { foreignKey: 'user_id' });
};

export default User;
