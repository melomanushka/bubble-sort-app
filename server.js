require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function bubbleSort(arr) {
    const sortedArray = [...arr];
    const n = sortedArray.length;
    
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (sortedArray[j] > sortedArray[j + 1]) {
                let temp = sortedArray[j];
                sortedArray[j] = sortedArray[j + 1];
                sortedArray[j + 1] = temp;
            }
        }
    }
    
    return sortedArray;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/sort', async (req, res) => {
    try {
        const { array } = req.body;
        
        if (!array || !Array.isArray(array)) {
            return res.status(400).json({ error: 'Массив не предоставлен' });
        }

        if (array.length === 0) {
            return res.status(400).json({ error: 'Массив не может быть пустым' });
        }

        const originalInput = req.body.originalInput;
        if (originalInput && originalInput.includes(' ') && !originalInput.includes(',')) {
            return res.status(400).json({ error: 'Используйте запятую для разделения чисел, а не пробел' });
        }
        
        const numArray = array.map((item, index) => {
            const trimmedItem = item.trim();
            
            if (trimmedItem === '') {
                throw new Error('Обнаружена пустая строка в позиции ' + (index + 1));
            }
            
            const num = parseFloat(trimmedItem);
            if (isNaN(num)) {
                throw new Error(`"${trimmedItem}" не является числом`);
            }
            return Math.floor(num);
        });
        
        const sortedArray = bubbleSort(numArray);
        
        const sortingResult = await pool.query(
            'INSERT INTO sorting DEFAULT VALUES RETURNING id, created_at'
        );
        
        const sortingId = sortingResult.rows[0].id;
        const createdAt = sortingResult.rows[0].created_at;
        
        for (let i = 0; i < numArray.length; i++) {
            await pool.query(
                'INSERT INTO sorting_element (sorting_id, element_index, value) VALUES ($1, $2, $3)',
                [sortingId, i, numArray[i]]
            );
        }
        
        for (let i = 0; i < sortedArray.length; i++) {
            await pool.query(
                'INSERT INTO sorting_element (sorting_id, element_index, value) VALUES ($1, $2, $3)',
                [sortingId, i + numArray.length, sortedArray[i]]
            );
        }
        
        res.json({
            success: true,
            originalArray: numArray,
            sortedArray: sortedArray,
            sortId: sortingId,
            sortTime: createdAt
        });
        
    } catch (error) {
        console.error('Ошибка при сортировке:', error);
        res.status(500).json({ 
            error: error.message || 'Ошибка сервера'
        });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const sortingsResult = await pool.query(
            'SELECT id, created_at FROM sorting ORDER BY created_at DESC'
        );
        
        const results = [];
        
        for (const sorting of sortingsResult.rows) {
            const originalResult = await pool.query(
                'SELECT value FROM sorting_element WHERE sorting_id = $1 AND element_index < (SELECT COUNT(*)/2 FROM sorting_element WHERE sorting_id = $1) ORDER BY element_index',
                [sorting.id]
            );
            
            const sortedResult = await pool.query(
                'SELECT value FROM sorting_element WHERE sorting_id = $1 AND element_index >= (SELECT COUNT(*)/2 FROM sorting_element WHERE sorting_id = $1) ORDER BY element_index',
                [sorting.id]
            );
            
            results.push({
                id: sorting.id,
                originalArray: originalResult.rows.map(row => row.value),
                sortedArray: sortedResult.rows.map(row => row.value),
                sortTime: sorting.created_at
            });
        }
        
        res.json(results);
    } catch (error) {
        console.error('Ошибка при получении результатов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте браузер: http://localhost:${PORT}`);
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
});