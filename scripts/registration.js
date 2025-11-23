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
        
        // Form Validation
        const signupForm = document.getElementById('signup-form');
        
        signupForm.addEventListener('submit', function(e) {
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
                // In a real app, this would send data to the server
                alert('Регистрация успешна! Перенаправление в личный кабинет...');
                // window.location.href = '/dashboard';
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
            });
        });