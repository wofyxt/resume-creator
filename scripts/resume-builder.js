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
        
        // Generate year options for education period
        function generateYearOptions(startYear, endYear) {
            const years = [];
            for (let year = startYear; year <= endYear; year++) {
                years.push(year);
            }
            return years;
        }
        
        // Populate year select elements
        function populateYearSelects() {
            const currentYear = new Date().getFullYear();
            const startYears = generateYearOptions(1970, currentYear);
            const endYears = generateYearOptions(1970, currentYear + 5);
            
            const startSelects = document.querySelectorAll('.edu-start-year');
            const endSelects = document.querySelectorAll('.edu-end-year');
            
            startSelects.forEach(select => {
                // Clear existing options except the first one
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Add year options
                startYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    select.appendChild(option);
                });
            });
            
            endSelects.forEach(select => {
                // Clear existing options except the first one
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Add year options
                endYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    select.appendChild(option);
                });
            });
        }
        
        // Validation functions
        function validateName(name) {
            const nameRegex = /^[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+$/;
            return nameRegex.test(name.trim());
        }
        
        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email.trim());
        }
        
        function validatePhone(phone) {
            // Российский формат: +7 (XXX) XXX-XX-XX
            const phoneRegex = /^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/;
            return phoneRegex.test(phone.trim());
        }
        
        function validateEducationPeriod(startYear, endYear) {
            if (!startYear || !endYear) {
                return { isValid: false, message: 'Выберите год начала и год окончания' };
            }
            
            if (parseInt(startYear) > parseInt(endYear)) {
                return { isValid: false, message: 'Год начала не может быть больше года окончания' };
            }
            
            return { isValid: true, message: '✓ Корректный период обучения' };
        }
        
        function formatPhone(value) {
            // Удаляем все нецифровые символы
            let numbers = value.replace(/\D/g, '');
            
            // Если номер начинается с 7 или 8, заменяем на +7
            if (numbers.startsWith('7') || numbers.startsWith('8')) {
                numbers = '7' + numbers.substring(1);
            }
            
            // Форматируем номер
            if (numbers.length === 0) return '';
            if (numbers.length <= 3) return '+7 (' + numbers;
            if (numbers.length <= 6) return '+7 (' + numbers.substring(0, 3) + ') ' + numbers.substring(3);
            if (numbers.length <= 8) return '+7 (' + numbers.substring(0, 3) + ') ' + numbers.substring(3, 6) + '-' + numbers.substring(6);
            
            return '+7 (' + numbers.substring(0, 3) + ') ' + numbers.substring(3, 6) + '-' + numbers.substring(6, 8) + '-' + numbers.substring(8, 10);
        }
        
        // Form Inputs to Preview with Validation
        const formInputs = document.querySelectorAll('#fullName, #jobTitle, #email, #phone, #location, #summary');
        
        formInputs.forEach(input => {
            input.addEventListener('input', function() {
                updatePreview();
                validateField(this);
            });
        });
        
        // Phone input formatting
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', function(e) {
            // Сохраняем позицию курсора
            const cursorPosition = e.target.selectionStart;
            const originalLength = e.target.value.length;
            
            // Форматируем номер
            e.target.value = formatPhone(e.target.value);
            
            // Восстанавливаем позицию курсора с учетом добавленных символов
            const newLength = e.target.value.length;
            const lengthDiff = newLength - originalLength;
            
            e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
            
            // Валидируем поле
            validateField(e.target);
            updatePreview();
        });
        
        function validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            let message = '';
            
            switch(field.id) {
                case 'fullName':
                    if (value === '') {
                        isValid = false;
                        message = 'Поле обязательно для заполнения';
                    } else if (!validateName(value)) {
                        isValid = false;
                        message = 'Введите ФИО в формате: Иванов Иван Иванович';
                    } else {
                        message = '✓ Корректное ФИО';
                    }
                    break;
                    
                case 'jobTitle':
                    if (value === '') {
                        isValid = false;
                        message = 'Поле обязательно для заполнения';
                    } else if (value.length < 2) {
                        isValid = false;
                        message = 'Название должности слишком короткое';
                    } else {
                        message = '✓ Корректная должность';
                    }
                    break;
                    
                case 'email':
                    if (value === '') {
                        isValid = false;
                        message = 'Поле обязательно для заполнения';
                    } else if (!validateEmail(value)) {
                        isValid = false;
                        message = 'Введите корректный email адрес';
                    } else {
                        message = '✓ Корректный email';
                    }
                    break;
                    
                case 'phone':
                    if (value === '') {
                        isValid = false;
                        message = 'Поле обязательно для заполнения';
                    } else if (!validatePhone(value)) {
                        isValid = false;
                        message = 'Введите телефон в формате: +7 (999) 123-45-67';
                    } else {
                        message = '✓ Корректный телефон';
                    }
                    break;
            }
            
            // Обновляем стиль поля и сообщение
            const validationElement = document.getElementById(field.id + 'Validation');
            if (validationElement) {
                validationElement.textContent = message;
                validationElement.className = 'validation-message ' + (isValid && value !== '' ? 'success' : 'error');
                
                if (value === '') {
                    validationElement.textContent = '';
                }
            }
            
            field.className = '';
            if (value !== '') {
                field.className = isValid ? 'success' : 'error';
            }
            
            return isValid;
        }
        
        function validateEducationFields(educationItem) {
            const startYear = educationItem.querySelector('.edu-start-year').value;
            const endYear = educationItem.querySelector('.edu-end-year').value;
            const validation = validateEducationPeriod(startYear, endYear);
            
            const validationElement = educationItem.querySelector('.edu-period-validation');
            if (validationElement) {
                validationElement.textContent = validation.message;
                validationElement.className = 'validation-message ' + (validation.isValid ? 'success' : 'error');
                
                if (!startYear && !endYear) {
                    validationElement.textContent = '';
                }
            }
            
            // Update select styles
            const startSelect = educationItem.querySelector('.edu-start-year');
            const endSelect = educationItem.querySelector('.edu-end-year');
            
            startSelect.className = 'edu-start-year';
            endSelect.className = 'edu-end-year';
            
            if (startYear || endYear) {
                const className = validation.isValid ? 'success' : 'error';
                startSelect.classList.add(className);
                endSelect.classList.add(className);
            }
            
            return validation.isValid;
        }
        
        function validateAllFields() {
            let isValid = true;
            
            const requiredFields = ['fullName', 'jobTitle', 'email', 'phone'];
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!validateField(field)) {
                    isValid = false;
                }
            });
            
            // Validate education periods
            const educationItems = document.querySelectorAll('#educationContainer .dynamic-item');
            educationItems.forEach(item => {
                if (!validateEducationFields(item)) {
                    isValid = false;
                }
            });
            
            return isValid;
        }
        
        function updatePreview() {
            document.getElementById('previewName').textContent = document.getElementById('fullName').value || 'Иванов Иван Иванович';
            document.getElementById('previewTitle').textContent = document.getElementById('jobTitle').value || 'Frontend разработчик';
            document.getElementById('previewEmail').textContent = document.getElementById('email').value || 'example@email.com';
            document.getElementById('previewPhone').textContent = document.getElementById('phone').value || '+7 (999) 123-45-67';
            document.getElementById('previewLocation').textContent = document.getElementById('location').value || 'Москва, Россия';
            document.getElementById('previewSummary').textContent = document.getElementById('summary').value || 'Опытный frontend разработчик с 5-летним опытом работы над веб-приложениями. Специализируюсь на JavaScript, React и современных фреймворках.';
        }
        
        // Experience Management
        const addExperienceBtn = document.getElementById('addExperience');
        const experienceContainer = document.getElementById('experienceContainer');
        
        addExperienceBtn.addEventListener('click', () => {
            const newExperience = document.createElement('div');
            newExperience.className = 'dynamic-item';
            newExperience.innerHTML = `
                <button class="remove-btn">×</button>
                
                <div class="form-group">
                    <label>Должность</label>
                    <input type="text" class="exp-position" placeholder="Frontend разработчик">
                </div>
                
                <div class="form-group">
                    <label>Компания</label>
                    <input type="text" class="exp-company" placeholder="ООО Технологии">
                </div>
                
                <div class="form-group">
                    <label>Период работы</label>
                    <input type="text" class="exp-period" placeholder="Январь 2020 - настоящее время">
                </div>
                
                <div class="form-group">
                    <label>Описание</label>
                    <textarea class="exp-description" placeholder="Описание ваших обязанностей и достижений"></textarea>
                </div>
            `;
            
            experienceContainer.appendChild(newExperience);
            
            // Add event listeners to new inputs
            const inputs = newExperience.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', updateExperiencePreview);
            });
            
            // Add remove functionality
            const removeBtn = newExperience.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => {
                newExperience.remove();
                updateExperiencePreview();
            });
            
            updateExperiencePreview();
        });
        
        // Update experience preview
        function updateExperiencePreview() {
            const previewContainer = document.getElementById('previewExperience');
            previewContainer.innerHTML = '';
            
            const experienceItems = document.querySelectorAll('#experienceContainer .dynamic-item');
            
            experienceItems.forEach(item => {
                const position = item.querySelector('.exp-position').value || 'Frontend разработчик';
                const company = item.querySelector('.exp-company').value || 'ООО Технологии';
                const period = item.querySelector('.exp-period').value || 'Январь 2020 - настоящее время';
                const description = item.querySelector('.exp-description').value || 'Разработка и поддержка пользовательских интерфейсов для веб-приложений. Оптимизация производительности и доступности.';
                
                const experienceHTML = `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <div class="resume-item-title">${position}</div>
                            <div class="resume-item-date">${period}</div>
                        </div>
                        <div class="resume-item-subtitle">${company}</div>
                        <div class="resume-item-description">
                            ${description}
                        </div>
                    </div>
                `;
                
                previewContainer.innerHTML += experienceHTML;
            });
            
            // If no experience items, show placeholder
            if (experienceItems.length === 0) {
                previewContainer.innerHTML = `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <div class="resume-item-title">Frontend разработчик</div>
                            <div class="resume-item-date">Январь 2020 - настоящее время</div>
                        </div>
                        <div class="resume-item-subtitle">ООО Технологии</div>
                        <div class="resume-item-description">
                            Разработка и поддержка пользовательских интерфейсов для веб-приложений. Оптимизация производительности и доступности.
                        </div>
                    </div>
                `;
            }
        }
        
        // Add event listeners to existing experience inputs
        document.querySelectorAll('#experienceContainer input, #experienceContainer textarea').forEach(input => {
            input.addEventListener('input', updateExperiencePreview);
        });
        
        // Education Management
        const addEducationBtn = document.getElementById('addEducation');
        const educationContainer = document.getElementById('educationContainer');
        
        addEducationBtn.addEventListener('click', () => {
            const newEducation = document.createElement('div');
            newEducation.className = 'dynamic-item';
            newEducation.innerHTML = `
                <button class="remove-btn">×</button>
                
                <div class="form-group">
                    <label>Учебное заведение</label>
                    <input type="text" class="edu-institution" placeholder="Московский государственный университет">
                </div>
                
                <div class="form-group">
                    <label>Специальность</label>
                    <input type="text" class="edu-degree" placeholder="Бакалавр информатики">
                </div>
                
                <div class="form-group">
                    <label>Период обучения *</label>
                    <div class="education-period">
                        <select class="edu-start-year" required>
                            <option value="">Год начала</option>
                        </select>
                        <span class="separator">-</span>
                        <select class="edu-end-year" required>
                            <option value="">Год окончания</option>
                        </select>
                    </div>
                    <div class="validation-message edu-period-validation"></div>
                </div>
            `;
            
            educationContainer.appendChild(newEducation);
            
            // Populate year selects for new education item
            populateYearSelects();
            
            // Add event listeners to new inputs
            const inputs = newEducation.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.classList.contains('edu-start-year') || input.classList.contains('edu-end-year')) {
                    input.addEventListener('change', function() {
                        validateEducationFields(newEducation);
                        updateEducationPreview();
                    });
                } else {
                    input.addEventListener('input', updateEducationPreview);
                }
            });
            
            // Add remove functionality
            const removeBtn = newEducation.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => {
                newEducation.remove();
                updateEducationPreview();
            });
            
            updateEducationPreview();
        });
        
        // Update education preview
        function updateEducationPreview() {
            const previewContainer = document.getElementById('previewEducation');
            previewContainer.innerHTML = '';
            
            const educationItems = document.querySelectorAll('#educationContainer .dynamic-item');
            
            educationItems.forEach(item => {
                const institution = item.querySelector('.edu-institution').value || 'Московский государственный университет';
                const degree = item.querySelector('.edu-degree').value || 'Бакалавр информатики';
                const startYear = item.querySelector('.edu-start-year').value;
                const endYear = item.querySelector('.edu-end-year').value;
                const period = startYear && endYear ? `${startYear} - ${endYear}` : '2016 - 2020';
                
                const educationHTML = `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <div class="resume-item-title">${degree}</div>
                            <div class="resume-item-date">${period}</div>
                        </div>
                        <div class="resume-item-subtitle">${institution}</div>
                    </div>
                `;
                
                previewContainer.innerHTML += educationHTML;
            });
            
            // If no education items, show placeholder
            if (educationItems.length === 0) {
                previewContainer.innerHTML = `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <div class="resume-item-title">Бакалавр информатики</div>
                            <div class="resume-item-date">2016 - 2020</div>
                        </div>
                        <div class="resume-item-subtitle">Московский государственный университет</div>
                    </div>
                `;
            }
        }
        
        // Add event listeners to existing education inputs
        document.querySelectorAll('#educationContainer input, #educationContainer select').forEach(input => {
            if (input.classList.contains('edu-start-year') || input.classList.contains('edu-end-year')) {
                input.addEventListener('change', function() {
                    const educationItem = this.closest('.dynamic-item');
                    validateEducationFields(educationItem);
                    updateEducationPreview();
                });
            } else {
                input.addEventListener('input', updateEducationPreview);
            }
        });
        
        // Skills Management
        const addSkillBtn = document.getElementById('addSkillBtn');
        const newSkillInput = document.getElementById('newSkill');
        const skillsContainer = document.getElementById('skillsContainer');
        
        addSkillBtn.addEventListener('click', () => {
            const skillText = newSkillInput.value.trim();
            if (skillText) {
                const skills = skillText.split(',').map(skill => skill.trim()).filter(skill => skill);
                
                skills.forEach(skill => {
                    const skillTag = document.createElement('div');
                    skillTag.className = 'skill-tag';
                    skillTag.innerHTML = `
                        ${skill} <span class="remove-skill">×</span>
                    `;
                    
                    skillsContainer.appendChild(skillTag);
                    
                    // Add remove functionality
                    const removeSkill = skillTag.querySelector('.remove-skill');
                    removeSkill.addEventListener('click', () => {
                        skillTag.remove();
                        updateSkillsPreview();
                    });
                });
                
                newSkillInput.value = '';
                updateSkillsPreview();
            }
        });
        
        // Update skills preview
        function updateSkillsPreview() {
            const previewContainer = document.getElementById('previewSkills');
            previewContainer.innerHTML = '';
            
            const skillTags = document.querySelectorAll('#skillsContainer .skill-tag');
            
            skillTags.forEach(tag => {
                const skillText = tag.textContent.replace('×', '').trim();
                const skillHTML = `<div class="resume-skill">${skillText}</div>`;
                previewContainer.innerHTML += skillHTML;
            });
            
            // If no skills, show placeholder
            if (skillTags.length === 0) {
                previewContainer.innerHTML = `
                    <div class="resume-skill">HTML/CSS</div>
                    <div class="resume-skill">JavaScript</div>
                    <div class="resume-skill">React</div>
                `;
            }
        }
        
        // Add event listeners to existing skill remove buttons
        document.querySelectorAll('#skillsContainer .remove-skill').forEach(btn => {
            btn.addEventListener('click', function() {
                this.parentElement.remove();
                updateSkillsPreview();
            });
        });
        
        // Template Selection
        const templateOptions = document.querySelectorAll('.template-option');
        const resumePreview = document.getElementById('resumePreview');
        
        templateOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all options
                templateOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                this.classList.add('active');
                
                // Change template
                const template = this.getAttribute('data-template');
                
                // Remove all template classes and add the selected one
                resumePreview.classList.remove('template-classic', 'template-modern', 'template-creative');
                resumePreview.classList.add(`template-${template}`);
            });
        });
        
        // Save and Export Buttons
        document.getElementById('saveBtn').addEventListener('click', function() {
            if (validateAllFields()) {
                alert('Резюме сохранено!');
            } else {
                alert('Пожалуйста, заполните все обязательные поля корректно');
            }
        });
        
        document.getElementById('exportBtn').addEventListener('click', function() {
            if (validateAllFields()) {
                alert('Экспорт в PDF начат...');
                // In a real app, this would generate and download a PDF
            } else {
                alert('Пожалуйста, заполните все обязательные поля корректно перед экспортом');
            }
        });
        
        // Initialize the form
        function initializeForm() {
            populateYearSelects();
            updatePreview();
            updateExperiencePreview();
            updateEducationPreview();
            updateSkillsPreview();
        }
        
        // Initialize the form when the page loads
        document.addEventListener('DOMContentLoaded', initializeForm);