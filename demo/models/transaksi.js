'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class transaksi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  transaksi.init({
    cart_id: DataTypes.INTEGER,
    jne_id: DataTypes.INTEGER,
    total_transaksi: DataTypes.INTEGER,
    point_transaksi: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'transaksi',
  });
  transaksi.associate = function(models) {
    transaksi.belongsTo(models.cart, {foreignKey: 'cart_id', as: 'cart'});
  };
};

module.exports = transaksi;