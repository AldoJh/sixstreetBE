import User from '../model/userModel.js';
import jwt from 'jsonwebtoken';

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401); // Unauthorized

    const user = await User.findOne({
      where: {
        refreshToken: refreshToken,
      },
    });

    if (!user) return res.sendStatus(403); // Forbidden

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403); // Forbidden

      const { email, username } = user;
      const accessToken = jwt.sign({ email, username }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '20s',
      });

      return res.json({ accessToken });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message }); // Internal Server Error
  }
};
