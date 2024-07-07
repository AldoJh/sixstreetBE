import User from "../model/userModel.js";
import News from "../model/newsModel.js";

//create news
export const createNews = async (req, res) => {
    const { judulberita, isi_berita, gambar } = req.body;
    const token = req.cookies.refreshToken;

    try {
        const user = await User.findOne({
            where: {
                refreshToken: token,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== 1) {
            return res.status(403).json({ message: "Access denied" });
        }

        const news = await News.create({
            user_id: user.id,
            judulberita,
            isi_berita,
            gambar,
        });

        res.status(201).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//get all news
export const getNews = async (req, res) => {
    try {
        const news = await News.findAll({
        });

        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//update news
export const updateNews = async (req, res) => {
    const { id } = req.params;
    const { judulberita, isi_berita, gambar } = req.body;
    const token = req.cookies.refreshToken;

    try {
        const user = await User.findOne({
            where: {
                refreshToken: token,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== 1) {
            return res.status(403).json({ message: "Access denied" });
        }

        const news = await News.findOne({
            where: {
                id,
            },
        });

        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }

        news.judulberita = judulberita;
        news.isi_berita = isi_berita;
        news.gambar = gambar;

        await news.save();

        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//find news by judulberita
export const findnews = async (req, res) => {
    const {judulberita} = req.body;
    try {
        const news = await News.findAll({
            where: {
                judulberita: judulberita,
            },
        });

        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//delete news
export const deleteNews = async (req, res) => {
    const { id } = req.params;
    const token = req.cookies.refreshToken;

    try {
        const user = await User.findOne({refreshToken: token});
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== 1) {
            return res.status(403).json({ message: "Access denied" });
        }
        const news = await News.findAll({id : id});
        if (!news) {
            return res.status(404).json({ message: "News not found" });
        }
        await News.destroy({where: {id: id}});
        res.status(200).json({ message: "News deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};