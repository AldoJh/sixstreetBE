'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class voucher extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  voucher.init({
    user_id: DataTypes.INTEGER,
    kode_voucher: DataTypes.STRING,
    jumlah_potongan: DataTypes.INTEGER,
    status: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'voucher',
  });
  voucher.associate = function(models) {
    voucher.belongsTo(models.user, {foreignKey: 'user_id', as: 'user'});
  };
};