import {Sequelize} from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const {DataTypes} = Sequelize;

const Cart = db.define('Cart', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User, // 'Users' would also work
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
    status : {
        type: DataTypes.STRING,
    },
    total : {
        type: DataTypes.INTEGER,
    },
},{
    freezeTableName: true,
});

User.hasMany(Cart, { foreignKey: 'user_id' });
Cart.belongsTo(User, { foreignKey: 'user_id' });

export default Cart;