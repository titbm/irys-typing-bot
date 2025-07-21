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
            // Базовая скорость печати (максимально натурально)
            baseSpeed: 250,      // Увеличено с 180 до 250ms (еще медленнее)
            speedVariation: 200, // Увеличено с 140 до 200ms (больше вариаций)
            
            // Вероятности ошибок (редкие ошибки)
            errorRate: 0.015,    // Уменьшено с 0.03 до 0.015 (1.5% ошибок)
            doubleKeyRate: 0.005, // Уменьшено с 0.01 до 0.005 (0.5% двойных нажатий)
            twoCharErrorRate: 0.3, // 30% ошибок будут на 2 символа (более реалистично)
            
            // Паузы (сильно увеличены для максимальной натуральности)
            wordPause: { min: 500, max: 1400 },      // Увеличено с 350-900 до 500-1400ms
            sentencePause: { min: 1500, max: 2800 }, // Увеличено с 1000-1800 до 1500-2800ms
            
            // Специальные символы (еще медленнее)
            slowCharacters: ['.', ',', '!', '?', ';', ':', '-', '_', '(', ')', '"', "'"],
            slowCharacterMultiplier: 2.2, // Увеличено с 1.8 до 2.2
            
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
            
            // Имитируем двойное нажатие (залипание клавиши)
            if (Math.random() < this.humanSettings.doubleKeyRate) {
                console.log(`🔁 Имитируем залипание клавиши: "${char}"`);
                await this.typeCharacter(char);
                await this.naturalPause('double');
                
                // Иногда (60% случаев) сразу исправляем, иногда замечаем позже
                const immediateCorrection = Math.random() < 0.6;
                
                if (immediateCorrection) {
                    console.log(`🔧 Сразу исправляем залипание`);
                    await this.typeBackspace();
                    await this.naturalPause('correction');
                } else {
                    console.log(`⏳ Заметим залипание через несколько символов`);
                    // Оставляем ошибку, исправим позже (это добавит еще больше реализма)
                }
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
     * Имитирует ошибку печати с исправлением (иногда на 1-2 символа)
     */
    async makeTypingError(correctChar) {
        // Решаем, будет ли это ошибка на 1 или 2 символа
        const isTwoCharError = Math.random() < this.humanSettings.twoCharErrorRate;
        
        if (isTwoCharError) {
            console.log(`🚫🚫 Имитируем двойную ошибку перед "${correctChar}"`);
            await this.makeTwoCharacterError(correctChar);
        } else {
            console.log(`🚫 Имитируем одиночную ошибку перед "${correctChar}"`);
            await this.makeSingleCharacterError(correctChar);
        }
    }

    /**
     * Имитирует ошибку на один символ
     */
    async makeSingleCharacterError(correctChar) {
        // Выбираем случайный неправильный символ
        const wrongChar = this.getRandomWrongChar(correctChar);
        
        console.log(`🚫 Печатаем неправильно: "${wrongChar}" вместо "${correctChar}"`);
        
        // Печатаем неправильный символ
        await this.typeCharacter(wrongChar);
        
        // Пауза на осознание ошибки
        await this.naturalPause('error_realization');
        
        // Исправляем ошибку
        await this.typeBackspace();
        await this.naturalPause('correction');
    }

    /**
     * Имитирует ошибку на два символа
     */
    async makeTwoCharacterError(correctChar) {
        // Выбираем два случайных неправильных символа
        const wrongChar1 = this.getRandomWrongChar(correctChar);
        const wrongChar2 = this.getRandomWrongChar(correctChar);
        
        console.log(`🚫🚫 Печатаем двойную ошибку: "${wrongChar1}${wrongChar2}" перед "${correctChar}"`);
        
        // Печатаем первый неправильный символ
        await this.typeCharacter(wrongChar1);
        await this.naturalPause('character');
        
        // Печатаем второй неправильный символ
        await this.typeCharacter(wrongChar2);
        
        // Более длинная пауза на осознание двойной ошибки
        await this.naturalPause('error_realization');
        await this.naturalPause('error_realization'); // Дополнительная пауза
        
        // Иногда (20% случаев) исправляем только один символ, оставляя небольшую ошибку
        const isPartialCorrection = Math.random() < 0.2;
        
        if (isPartialCorrection) {
            console.log(`🔧 Частичное исправление: убираем только последний символ`);
            await this.typeBackspace();
            await this.naturalPause('correction');
        } else {
            console.log(`🔧🔧 Полное исправление: убираем оба символа`);
            // Исправляем оба символа
            await this.typeBackspace();
            await this.naturalPause('correction');
            await this.typeBackspace();
            await this.naturalPause('correction');
        }
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
                pauseTime = this.randomBetween(600, 1400); // Увеличено с 300-800 до 600-1400ms
                break;
                
            case 'correction':
                pauseTime = this.randomBetween(400, 800); // Увеличено с 200-400 до 400-800ms
                break;
                
            case 'double':
                pauseTime = this.randomBetween(100, 300); // Увеличено с 50-150 до 100-300ms
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
        
        // Добавляем случайные дополнительные паузы (5% шанс длинной паузы)
        if (Math.random() < 0.05) {
            basePause += this.randomBetween(500, 1500); // Случайная длинная пауза
        }
        
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
        
        return Math.max(basePause, 100); // Увеличено минимум с 50ms до 100ms
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
