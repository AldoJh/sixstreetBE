import { Sequelize } from 'sequelize';
import db from '../config/database.js';

const { DataTypes } = Sequelize;

const EmailModel = db.define(
  'email',
  {
    email: {
      type: DataTypes.STRING,
    },
  },
  {
    freezeTableName: true,
  }
);


export default EmailModel;
