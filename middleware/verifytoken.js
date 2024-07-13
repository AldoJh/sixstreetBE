import jwt from 'jsonwebtoken';
import Cookies from 'js-cookie';

const invalidatedTokens = [];

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : Cookies.get('accessToken');
  if (token == null) return res.sendStatus(401);

  if (invalidatedTokens.includes(token)) {
    return res.sendStatus(403);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
