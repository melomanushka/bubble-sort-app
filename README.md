# Приложение для сортировки массивов методом пузырька

## Описание

Веб-приложение для сортировки числовых массивов методом пузырька с сохранением результатов в базе данных PostgreSQL.

## Функциональность

- Сортировка массива методом пузырька
- Веб-интерфейс для ввода данных
- Сохранение результатов в базе данных
- Просмотр истории сортировок

## Технологии

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **IDE**: Visual Studio Code

## Установка и запуск

### 1. Клонирование проекта
```bash
git clone <url-репозитория>
cd bubble-sort-app
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка базы данных
1. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE bubble_sort_db;
```

2. Создайте таблицу:
```sql
CREATE TABLE sorting (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sorting_element (
    id SERIAL PRIMARY KEY,
    sorting_id INTEGER REFERENCES sortings(id) ON DELETE CASCADE,
    element_index INTEGER,
    value INTEGER
);

```

### 3. Настройка подключения к БД
Отредактируйте файл `server.js`, указав ваши данные для подключения к PostgreSQL:
```javascript
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'bubble_sort_db',
    password: 'your_password',
    port: 5432,
});
```

### 4. Запуск приложения
```bash
# Для разработки (с автоперезагрузкой)
npm run dev

# Для продакшена
npm start
```