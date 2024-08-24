import {Sequelize} from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const {DataTypes} = Sequelize;

const Address = db.define('Address', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User, 
            key: 'id',
        },
    },
   address : {
    type: DataTypes.STRING,
    },
},{
    freezeTableName: true,
});

User.hasMany(Address, { foreignKey: 'user_id' });
Address.belongsTo(User, { foreignKey: 'user_id' });

export default Address;