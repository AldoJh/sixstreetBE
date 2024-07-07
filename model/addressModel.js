import {Sequelize} from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const {DataTypes} = Sequelize;

const Address = db.define('Address', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User, // 'Users' would also work
            key: 'id',
        },
    },
   address : {
    type: DataTypes.STRING,
    },
},{
    freezeTableName: true,
});

export default Address;