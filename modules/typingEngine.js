/**
 * МОДУЛЬ ПЕЧАТИ ДЛЯ SPRITETYPE.IRYS.XYZ
 * Отвечает за автоматическую печать символов через Chrome Debugger API
 * С имитацией человеческого поведения
 */

class TypingEngine {
    constructor() {
        // Состояние типинга
        this.typingState = {
            isRunning: false,
            currentWordIndex: 0,
            currentCharIndex: 0,
            wordsToType: []
        };

        // Настройки натуральности печати (жестко заданы для высокой натуральности)
        this.humanSettings = {
            // Базовая скорость печати (замедлена + высокая натуральность)
            baseSpeed: 180,      // Увеличено с 120 до 180ms (медленнее)
            speedVariation: 140, // Увеличено с 80 до 140ms (больше вариаций)
            
            // Вероятности ошибок (редкие ошибки)
            errorRate: 0.015,    // Уменьшено с 0.03 до 0.015 (1.5% ошибок)
            doubleKeyRate: 0.005, // Уменьшено с 0.01 до 0.005 (0.5% двойных нажатий)
            
            // Паузы (увеличены для натуральности)
            wordPause: { min: 350, max: 900 },      // Увеличено для высокой натуральности
            sentencePause: { min: 1000, max: 1800 }, // Увеличено после точек
            
            // Специальные символы (медленнее)
            slowCharacters: ['.', ',', '!', '?', ';', ':', '-', '_', '(', ')', '"', "'"],
            slowCharacterMultiplier: 1.8, // Увеличено с 1.5 до 1.8
            
            // Часто ошибочные комбинации букв
            errorProneChars: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
        };
    }

    /**
     * Запускает печать всех слов (используется фиксированная высокая натуральность)
     */
    async startTyping(words, settings = {}) {
        if (this.typingState.isRunning) {
            console.log('⚠️ Печать уже запущена');
            return;
        }

        console.log(`🚀 Запуск натуральной печати ${words.length} слов (высокая натуральность, редкие ошибки)`);
        console.log('👤 Настройки натуральности:', this.humanSettings);
        
        // Настраиваем состояние
        this.typingState.isRunning = true;
        this.typingState.currentWordIndex = 0;
        this.typingState.currentCharIndex = 0;
        this.typingState.wordsToType = words;
        this.typingState.forceStopped = false; // Флаг принудительной остановки
        
        try {
            // Запускаем печать всех слов
            await this.typeAllWords(words);
        } catch (error) {
            console.error('❌ Ошибка печати:', error);
            this.stopTyping();
            throw error;
        }
    }

    /**
     * Печатает все слова подряд с пробелами
     */
    async typeAllWords(words) {
        console.log(`⌨️ Начинаем натуральную печать ${words.length} слов`);
        
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            if (!this.typingState.isRunning || this.typingState.forceStopped) {
                console.log('🛑 Печать остановлена');
                break;
            }
            
            const word = words[wordIndex];
            console.log(`📝 Печатаем слово ${wordIndex + 1}/${words.length}: "${word}"`);
            
            // Обновляем состояние
            this.typingState.currentWordIndex = wordIndex;
            this.typingState.currentCharIndex = 0;
            
            // Печатаем слово с натуральностью
            await this.typeWordNaturally(word);
            
            // Добавляем пробел между словами (кроме последнего)
            if (wordIndex < words.length - 1) {
                await this.typeCharacter(' ');
                await this.naturalPause('word');
            }
        }
        
        console.log('✅ ВСЕ СЛОВА напечатаны натурально!');
        this.stopTyping();
    }

    /**
     * Печатает слово с имитацией человеческого поведения
     */
    async typeWordNaturally(word) {
        console.log(`👤 Начинаем натуральную печать слова "${word}"`);
        
        for (let i = 0; i < word.length; i++) {
            if (!this.typingState.isRunning || this.typingState.forceStopped) {
                break;
            }
            
            const char = word[i];
            
            // Имитируем ошибку с определенной вероятностью
            if (Math.random() < this.humanSettings.errorRate) {
                await this.makeTypingError(char);
            }
            
            // Имитируем двойное нажатие
            if (Math.random() < this.humanSettings.doubleKeyRate) {
                await this.typeCharacter(char);
                await this.naturalPause('double');
                await this.typeBackspace();
                await this.naturalPause('correction');
            }
            
            // Печатаем правильный символ
            await this.typeCharacter(char);
            
            // Обновляем состояние
            this.typingState.currentCharIndex = i + 1;
            
            // Натуральная пауза перед следующим символом
            if (i < word.length - 1) {
                await this.naturalPause('character', char);
            }
        }
        
        console.log(`✅ Слово "${word}" напечатано натурально`);
    }

    /**
     * Имитирует ошибку печати с исправлением
     */
    async makeTypingError(correctChar) {
        // Выбираем случайный неправильный символ
        const wrongChar = this.getRandomWrongChar(correctChar);
        
        console.log(`🚫 Имитируем ошибку: "${wrongChar}" вместо "${correctChar}"`);
        
        // Печатаем неправильный символ
        await this.typeCharacter(wrongChar);
        
        // Пауза на осознание ошибки
        await this.naturalPause('error_realization');
        
        // Исправляем ошибку
        await this.typeBackspace();
        await this.naturalPause('correction');
    }

    /**
     * Генерирует случайный неправильный символ
     */
    getRandomWrongChar(correctChar) {
        const keyboard = 'qwertyuiopasdfghjklzxcvbnm';
        const currentIndex = keyboard.indexOf(correctChar.toLowerCase());
        
        // Выбираем соседние клавиши для более реалистичных ошибок
        const neighbors = [];
        if (currentIndex > 0) neighbors.push(keyboard[currentIndex - 1]);
        if (currentIndex < keyboard.length - 1) neighbors.push(keyboard[currentIndex + 1]);
        
        // Добавляем несколько случайных символов
        neighbors.push(...'tyuiop'.split(''));
        
        return neighbors[Math.floor(Math.random() * neighbors.length)] || 'x';
    }

    /**
     * Печатает backspace для исправления ошибки
     */
    async typeBackspace() {
        console.log('⬅️ Печатаем backspace для исправления');
        
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'TYPE_BACKSPACE'
            }, (response) => {
                resolve();
            });
        });
    }

    /**
     * Создает натуральные паузы разной длительности
     */
    async naturalPause(type, character = null) {
        let pauseTime;
        
        switch (type) {
            case 'character':
                pauseTime = this.calculateCharacterPause(character);
                break;
                
            case 'word':
                pauseTime = this.randomBetween(
                    this.humanSettings.wordPause.min,
                    this.humanSettings.wordPause.max
                );
                break;
                
            case 'sentence':
                pauseTime = this.randomBetween(
                    this.humanSettings.sentencePause.min,
                    this.humanSettings.sentencePause.max
                );
                break;
                
            case 'error_realization':
                pauseTime = this.randomBetween(300, 800);
                break;
                
            case 'correction':
                pauseTime = this.randomBetween(200, 400);
                break;
                
            case 'double':
                pauseTime = this.randomBetween(50, 150);
                break;
                
            default:
                pauseTime = this.humanSettings.baseSpeed;
        }
        
        if (pauseTime > 0) {
            await this.delay(pauseTime);
        }
    }

    /**
     * Вычисляет время паузы для конкретного символа
     */
    calculateCharacterPause(character) {
        let basePause = this.humanSettings.baseSpeed;
        
        // Применяем вариацию скорости
        const variation = (Math.random() - 0.5) * this.humanSettings.speedVariation;
        basePause += variation;
        
        // Медленнее для специальных символов
        if (character && this.humanSettings.slowCharacters.includes(character)) {
            basePause *= this.humanSettings.slowCharacterMultiplier;
        }
        
        // Пауза после предложений
        if (character && ['.', '!', '?'].includes(character)) {
            return this.randomBetween(
                this.humanSettings.sentencePause.min,
                this.humanSettings.sentencePause.max
            );
        }
        
        return Math.max(basePause, 50); // Минимум 50ms
    }

    /**
     * Генерирует случайное число между min и max
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Печатает одну букву через Chrome Debugger API
     */
    async typeCharacter(char) {
        console.log(`🔤 ОТПРАВЛЯЕМ СИМВОЛ: "${char}" (код: ${char.charCodeAt(0)})`);
        
        // Отправляем команду в background для использования debugger API
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'TYPE_CHARACTER',
                character: char
            }, (response) => {
                if (response && response.success) {
                    console.log(`✅ Символ "${char}" УСПЕШНО отправлен через Debugger API`);
                } else {
                    console.log(`❌ ОШИБКА отправки символа "${char}":`, response?.error);
                }
                resolve();
            });
        });
    }

    /**
     * Получает код клавиши для символа
     */
    getKeyCode(char) {
        if (char === ' ') return 'Space';
        if (char >= 'a' && char <= 'z') return `Key${char.toUpperCase()}`;
        if (char >= 'A' && char <= 'Z') return `Key${char}`;
        if (char >= '0' && char <= '9') return `Digit${char}`;
        
        const specialKeys = {
            '.': 'Period', ',': 'Comma', '!': 'Digit1', '?': 'Slash',
            ';': 'Semicolon', ':': 'Semicolon', '-': 'Minus', '_': 'Minus',
            "'": 'Quote', '"': 'Quote', '(': 'Digit9', ')': 'Digit0'
        };
        
        return specialKeys[char] || 'Unknown';
    }

    /**
     * Останавливает печать
     */
    stopTyping(reason = 'manual') {
        console.log(`🛑 Остановка печати (причина: ${reason})`);
        this.typingState.isRunning = false;
        this.typingState.currentWordIndex = 0;
        this.typingState.currentCharIndex = 0;
        this.typingState.wordsToType = [];
        
        if (reason === 'game_end') {
            this.typingState.forceStopped = true;
        }
    }

    /**
     * Принудительно останавливает печать (при окончании игры)
     */
    forceStop() {
        console.log('🏁 ПРИНУДИТЕЛЬНАЯ ОСТАНОВКА ПЕЧАТИ - ИГРА ЗАКОНЧЕНА!');
        this.typingState.forceStopped = true;
        this.stopTyping('game_end');
    }

    /**
     * Проверяет, запущена ли печать
     */
    isRunning() {
        return this.typingState.isRunning;
    }

    /**
     * Получает текущее состояние печати
     */
    getState() {
        return { ...this.typingState };
    }

    /**
     * Задержка
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Экспорт для использования в других модулях
window.TypingEngine = TypingEngine;
