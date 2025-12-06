{// Общие функции аутентификации для всех страниц
const API_URL = 'http://localhost:3000/api';

// Получение токена
function getToken() {
    return localStorage.getItem('authToken');
}

// Получение данных пользователя
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Выход из системы
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Проверка авторизации
function isAuthenticated() {
    return !!getToken();
}

// Защищенные маршруты - добавляйте эту функцию на страницы, требующие авторизации
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Функция для сохранения резюме (будет использоваться позже)
async function saveResume(title, resumeData) {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Необходима авторизация');
        }
        
        const response = await fetch(`${API_URL}/resumes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, data: resumeData }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Ошибка сохранения резюме:', error);
        throw error;
    }
}}