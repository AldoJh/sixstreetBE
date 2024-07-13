import User from '../model/userModel.js';
import News from '../model/newsModel.js';
import path from 'path';

//get all news
export const getNews = async (req, res) => {
  try {
    const news = await News.findAll({});

    const responseNews = news.map((news) => {
      return {
        id: news.id,
        judulberita: news.judulberita,
        isi_berita: news.isi_berita,
        gambar: news.gambar,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt,
      };
    });

    res.status(200).json(responseNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get news by id
export const getNewsById = async (req, res) => {
  const { id } = req.params;
  try {
    const news = await News.findOne({
      where: {
        id: id,
      },
    });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    const responseNews = {
      id: news.id,
      judulberita: news.judulberita,
      isi_berita: news.isi_berita,
      gambar: news.gambar,
      createdAt: news.createdAt,
      updatedAt: news.updatedAt,
    };

    res.status(200).json(responseNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get news by judul berita
export const getNewsByJudul = async (req, res) => {
  const { judulberita } = req.params;
  try {
    const news = await News.findOne({
      where: {
        judulberita: judulberita,
      },
    });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    const responseNews = {
      id: news.id,
      judulberita: news.judulberita,
      isi_berita: news.isi_berita,
      gambar: news.gambar,
      createdAt: news.createdAt,
      updatedAt: news.updatedAt,
    };

    res.status(200).json(responseNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//create news
export const createNews = async (req, res) => {
  const { judulberita, isi_berita } = req.body;
  const pathGambar = req.file.path;

  try {
    const user = await User.findOne({
      where: {
        role: 1,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or not authorized' });
    }

    const news = await News.create({
      user_id: user.id,
      judulberita,
      isi_berita,
      gambar: pathGambar,
    });

    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//update news
export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { judulberita, isi_berita } = req.body;
  const gambarPath = req.file ? req.file.path : null;

  try {
    const user = await User.findOne({
      where: {
        role: 1,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or not authorized' });
    }

    // Check if news exists
    const news = await News.findOne({
      where: {
        id: id,
      },
    });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    await News.update(
      {
        judulberita,
        isi_berita,
        gambar: gambarPath ? gambarPath : news.gambar,
      },
      {
        where: {
          id: id,
        },
      }
    );

    const updatedNews = await News.findOne({
      where: {
        id: id,
      },
    });

    const responseNews = {
      id: updatedNews.id,
      judulberita: updatedNews.judulberita,
      isi_berita: updatedNews.isi_berita,
      gambar: updatedNews.gambar,
    };

    res.status(200).json(responseNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//find news by judulberita
export const findnews = async (req, res) => {
  const { judulberita } = req.body;
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

  try {
    const user = await User.findOne({
      where: {
        role: 1,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or not authorized' });
    }

    const news = await News.findOne({
      where: {
        id: id,
      },
    });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    await News.destroy({ where: { id: id } });
    res.status(200).json({ message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
