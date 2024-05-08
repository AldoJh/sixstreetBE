import {Sequelize} from 'sequelize';
import db from '../config/database.js';

const {DataTypes} = Sequelize;

const User = db.define('User', {
    username: {
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
    address: {
        type: DataTypes.STRING,
    },
    profile_foto: {
        type: DataTypes.STRING,
    },
    membership: {
        type: DataTypes.INTEGER,
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
},{
    freezeTableName: true,
});

export default User;