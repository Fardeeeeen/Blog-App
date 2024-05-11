
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import pkg from 'pg';
import Sequelize from 'sequelize';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);
const viewsPath = path.join(__dirname, '..', 'client', 'views');
const publicPath = path.join(__dirname, '..', 'client','public');

let sequelize;

if (process.env.DB_URL) {
  sequelize = new Sequelize(process.env.DB_URL, {
    dialect: 'postgres',
    ssl: true, // Enable SSL if required by Render
  });
} else {
  console.error("DB_URL is not available. Please check your environment configuration.");
  process.exit(1); // Exit the application if DB_URL is not available
}

// Post model
const Post = sequelize.define('post', {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  author: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  imagePath: {
    type: Sequelize.STRING,
    allowNull: true,
  }
});

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/') 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ dest: 'public/uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));
app.set('views', viewsPath);
app.set('view engine', 'ejs');

let posts = [];

app.get("/", (req, res) => {
  const homeblogUrl = '/images/homeblog.png'
  const fashionblogUrl = '/images/fashionblog.png';
  const travelblogUrl = '/images/travelblog.png';
  const foodblogUrl = '/images/foodblog.png';
  const gymblogUrl = '/images/gymblog.png';
    res.render("index.ejs", { currentPage: 'home', homeblogUrl,  fashionblogUrl, travelblogUrl, foodblogUrl, gymblogUrl});
});

app.get('/create', (req, res) => {
    res.render('create.ejs', { currentPage: 'create'});
});

app.get('/alternative', (req, res) => {
  const alternativeTasks = [
      { task: 'Read a Book'},
      { task: 'Watch a video'},
  ];
    res.render('alternative.ejs', { currentPage: 'alternative' });
});


// Retrieve all posts
app.get("/posts", async (req, res) => {
    try {
        const { rows: posts } = await pool.query('SELECT * FROM posts');
        res.render("posts.ejs", { currentPage: 'posts', posts });
    } catch (error) {
        console.error("Error retrieving posts:", error);
        res.status(500).send("Error retrieving posts");
    }
});


// Create a new post
app.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { title, author, content } = req.body;
        const imagePath = req.file ? '/uploads/' + req.file.filename : null;
        await pool.query('INSERT INTO posts (title, author, content, image_path) VALUES ($1, $2, $3, $4)', [title, author, content, imagePath]);
        res.redirect('/posts');
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).send("Error creating post");
    }
});


// Handle image uploads
app.post('/upload', upload.single('upload'), (req, res) => {
    try {
        const uploadedImagePath = '/uploads/' + req.file.filename;
        res.send({ "uploaded": true, "url": uploadedImagePath });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).send("Error uploading image");
    }
});

/* This code snippet is handling the editing and updating of a specific post in the blog application. */
app.get('/edit/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { rows: posts } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
        if (posts.length === 0) {
            res.redirect('/posts');
        } else {
            const post = posts[0];
            res.render('edit', { id, post });
        }
    } catch (error) {
        console.error("Error editing post:", error);
        res.status(500).send("Error editing post");
    }
});

app.post('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const { title, author, content } = req.body;
        const imagePath = req.file ? '/uploads/' + req.file.filename : null;
        await pool.query('UPDATE posts SET title = $1, author = $2, content = $3, image_path = $4 WHERE id = $5', [title, author, content, imagePath, id]);
        res.redirect('/posts');
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("Error updating post");
    }
});

// Delete a post
app.get('/delete/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM posts WHERE id = $1', [id]);
        res.redirect('/posts');
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).send("Error deleting post");
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
