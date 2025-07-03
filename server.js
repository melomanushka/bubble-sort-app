// Импортируем необходимые модули
const express = require('express');  // Фреймворк для создания веб-сервера
const { Pool } = require('pg');      // Для работы с PostgreSQL
const cors = require('cors');        // Для разрешения CORS запросов
const path = require('path');        // Для работы с путями файлов

// Создаем приложение Express
const app = express();
const PORT = 3000;  // Порт, на котором будет работать сервер

// Настройка подключения к базе данных
const pool = new Pool({
    user: 'postgres',           // Имя пользователя PostgreSQL
    host: 'localhost',          // Хост базы данных
    database: 'bubble_sort_db', // Имя базы данных
    password: 'your_password',  // ЗАМЕНИТЕ НА ВАШИЙ ПАРОЛЬ
    port: 5432,                 // Порт PostgreSQL
});

// Middleware (промежуточное ПО)
app.use(cors());                    // Разрешаем CORS
app.use(express.json());            // Позволяем серверу понимать JSON
app.use(express.static('public'));  // Раздаем статические файлы из папки public

// Функция сортировки пузырьком
function bubbleSort(arr) {
    // Создаем копию массива, чтобы не изменять оригинал
    const sortedArray = [...arr];
    const n = sortedArray.length;

    // Внешний цикл - проходы по массиву
    for (let i = 0; i < n - 1; i++) {
        // Внутренний цикл - сравнение соседних элементов
        for (let j = 0; j < n - i - 1; j++) {
            // Если текущий элемент больше следующего, меняем их местами
            if (sortedArray[j] > sortedArray[j + 1]) {
                // Обмен элементов
                let temp = sortedArray[j];
                sortedArray[j] = sortedArray[j + 1];
                sortedArray[j + 1] = temp;
            }
        }
    }

    return sortedArray;
}

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API маршрут для сортировки массива
app.post('/api/sort', async (req, res) => {
    try {
        // Получаем массив из тела запроса
        const { array } = req.body;

        // Проверяем, что массив передан
        if (!array || !Array.isArray(array)) {
            return res.status(400).json({ error: 'Массив не предоставлен или неверного формата' });
        }

        // Преобразуем все элементы в числа
        const numArray = array.map(item => {
            const num = parseFloat(item);
            if (isNaN(num)) {
                throw new Error(`"${item}" не является числом`);
            }
            return num;
        });

        // Выполняем сортировку
        const sortedArray = bubbleSort(numArray);

        // Сохраняем результат в базу данных
        const query = `
            INSERT INTO sorting_results (original_array, sorted_array) 
            VALUES ($1, $2) 
            RETURNING id, sort_time
        `;

        const result = await pool.query(query, [
            JSON.stringify(numArray),     // Исходный массив
            JSON.stringify(sortedArray)   // Отсортированный массив
        ]);

        // Отправляем результат клиенту
        res.json({
            success: true,
            originalArray: numArray,
            sortedArray: sortedArray,
            sortId: result.rows[0].id,
            sortTime: result.rows[0].sort_time
        });

    } catch (error) {
        console.error('Ошибка при сортировке:', error);
        res.status(500).json({
            error: 'Ошибка сервера',
            details: error.message
        });
    }
});

// API маршрут для получения всех результатов сортировки
app.get('/api/results', async (req, res) => {
    try {
        const query = 'SELECT * FROM sorting_results ORDER BY sort_time DESC';
        const result = await pool.query(query);

        // Преобразуем строки обратно в массивы
        const results = result.rows.map(row => ({
            id: row.id,
            originalArray: JSON.parse(row.original_array),
            sortedArray: JSON.parse(row.sorted_array),
            sortTime: row.sort_time
        }));

        res.json(results);
    } catch (error) {
        console.error('Ошибка при получении результатов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API маршрут для получения конкретного результата по ID
app.get('/api/results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM sorting_results WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Результат не найден' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            originalArray: JSON.parse(row.original_array),
            sortedArray: JSON.parse(row.sorted_array),
            sortTime: row.sort_time
        });
    } catch (error) {
        console.error('Ошибка при получении результата:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте браузер и перейдите по адресу: http://localhost:${PORT}`);
});

// Обработка ошибок подключения к базе данных
pool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
});