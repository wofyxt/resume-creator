// Конфигурация API
const API_URL = 'http://localhost:3000/api';

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const closeMenu = document.querySelector('.close-menu');
const overlay = document.querySelector('.overlay');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
});

closeMenu.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
});

overlay.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Функции для работы с аутентификацией
function saveToken(token) {
    localStorage.setItem('authToken', token);
    console.log('Токен сохранен');
}

function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Функция для показа сообщений об ошибках/успехе
function showMessage(message, type = 'error') {
    // Удаляем существующие сообщения
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Создаем новое сообщение
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.textContent = message;
    
    // Вставляем перед формой
    const form = document.getElementById('signup-form');
    form.parentNode.insertBefore(messageDiv, form);
    
    // Автоматически удаляем через 5 секунд
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Основная обработка формы регистрации
const signupForm = document.getElementById('signup-form');

signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let isValid = true;
    
    // Name validation
    const nameInput = document.getElementById('name');
    const nameError = document.getElementById('name-error');
    if (!nameInput.value.trim()) {
        nameError.classList.add('show');
        nameInput.classList.add('error');
        isValid = false;
    } else {
        nameError.classList.remove('show');
        nameInput.classList.remove('error');
    }
    
    // Email validation
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
        emailError.classList.add('show');
        emailInput.classList.add('error');
        isValid = false;
    } else {
        emailError.classList.remove('show');
        emailInput.classList.remove('error');
    }
    
    // Password validation
    const passwordInput = document.getElementById('password');
    const passwordError = document.getElementById('password-error');
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordInput.value)) {
        passwordError.classList.add('show');
        passwordInput.classList.add('error');
        isValid = false;
    } else {
        passwordError.classList.remove('show');
        passwordInput.classList.remove('error');
    }
    
    // Confirm password validation
    const confirmPasswordInput = document.getElementById('confirm-password');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordError.classList.add('show');
        confirmPasswordInput.classList.add('error');
        isValid = false;
    } else {
        confirmPasswordError.classList.remove('show');
        confirmPasswordInput.classList.remove('error');
    }
    
    if (isValid) {
        // Показываем индикатор загрузки
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;
        
        try {
            // Отправляем данные на сервер
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: nameInput.value.trim(),
                    email: emailInput.value,
                    password: passwordInput.value
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Успешная регистрация
                saveToken(data.token);
                saveUser(data.user);
                
                showMessage('✅ Регистрация успешна! Перенаправление...', 'success');
                
                // Перенаправляем на главную страницу через 2 секунды
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
            } else {
                // Ошибка от сервера
                showMessage('❌ Ошибка: ' + data.error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Ошибка сети:', error);
            showMessage('❌ Сетевая ошибка. Проверьте подключение к интернету.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
});

// Real-time validation
document.querySelectorAll('#signup-form input').forEach(input => {
    input.addEventListener('input', function() {
        const errorElement = document.getElementById(`${this.id}-error`);
        if (errorElement) {
            errorElement.classList.remove('show');
            this.classList.remove('error');
        }
        
        // Удаляем сообщения при вводе
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    });
});

// Проверяем, авторизован ли пользователь
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Если пользователь уже авторизован, перенаправляем на главную
        window.location.href = 'index.html';
    }
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});