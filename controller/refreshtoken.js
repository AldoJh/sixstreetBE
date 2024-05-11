import user from '../model/userModel.js';
import jwt from 'jsonwebtoken';

export const refreshToken = async (req, res) => {
    try{
        const refreshToken = req.body.refreshToken;
        if(refreshToken == null) return res.sendStatus(401);
        const user = await user.findOne({where : {refreshToken : refreshToken}});
        if(user == null) return res.sendStatus(403);
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if(err) return res.sendStatus(403);
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                if(err) return res.sendStatus(403);
                const accessToken = jwt.sign({email: user.email, username: user.username}, process.env.ACCESS_TOKEN_SECRET,{
                    expiresIn: '20s',
                });
                res.json({accessToken: accessToken});
            });
        });
    }catch(error){
        res.json({message : error});
    }
}