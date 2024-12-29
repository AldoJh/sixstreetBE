import { Sequelize } from 'sequelize';

const db = new Sequelize('six6street', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});

export default db;
