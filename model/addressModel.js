import { Sequelize } from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const { DataTypes } = Sequelize;

const Address = db.define(
  'Address',
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    province_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    province_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subdistrict_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subdistrict_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kelurahan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    detail_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    freezeTableName: true,
  }
);

User.hasMany(Address, { foreignKey: 'user_id' });
Address.belongsTo(User, { foreignKey: 'user_id' });

export default Address;
