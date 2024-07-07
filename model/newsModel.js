import {Sequelize} from 'sequelize';
import db from '../config/database.js';
import User from './userModel.js';

const {DataTypes} = Sequelize;

const News = db.define('News', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User, // 'Users' would also work
            key: 'id',
        },
    },
   judulberita : {
    type: DataTypes.STRING,
    },
    isi_berita : {
        type: DataTypes.TEXT,
    },
    gambar : {
        type: DataTypes.STRING,
    },
},{
    freezeTableName: true,
});

User.hasMany(News, { foreignKey: 'user_id' });
News.belongsTo(User, { foreignKey: 'user_id' });
export default News;