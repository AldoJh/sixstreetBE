'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  user.init({
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    no_hp: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.STRING,
    profile_foto: DataTypes.STRING,
    membership: DataTypes.INTEGER,
    kode_user: DataTypes.STRING,
    referd_kode: DataTypes.STRING,
    role: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'user',
  });
  user.associate = function(models) {
    user.hasMany(models.news, {foreignKey: 'user_id', as: 'news'});
  };
  user.associate = function(models) {
    user.hasMany(models.voucher, {foreignKey: 'user_id', as: 'voucher'});
  };
  user.associate = function(models) {
    user.hasMany(models.cart, {foreignKey: 'user_id', as: 'cart'});
  };
};

module.exports = user;