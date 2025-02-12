const express = require('express');
const app = express();
const path = require('path');


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.render('index', { title: 'Home' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
