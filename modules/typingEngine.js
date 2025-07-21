/**
 * МОДУЛЬ ПЕЧАТИ ДЛЯ SPRITETYPE.IRYS.XYZ
 * Отвечает за автоматическую печать символов через Chrome Debugger API
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
    }

    /**
     * Запускает печать всех слов
     */
    async startTyping(words) {
        if (this.typingState.isRunning) {
            console.log('⚠️ Печать уже запущена');
            return;
        }

        console.log(`🚀 Запуск печати ${words.length} слов`);
        
        // Настраиваем состояние
        this.typingState.isRunning = true;
        this.typingState.currentWordIndex = 0;
        this.typingState.currentCharIndex = 0;
        this.typingState.wordsToType = words;
        
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
        console.log(`⌨️ Начинаем печать ${words.length} слов`);
        
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            if (!this.typingState.isRunning) {
                console.log('🛑 Печать остановлена');
                break;
            }
            
            const word = words[wordIndex];
            console.log(`📝 Печатаем слово ${wordIndex + 1}/${words.length}: "${word}"`);
            
            // Обновляем состояние
            this.typingState.currentWordIndex = wordIndex;
            this.typingState.currentCharIndex = 0;
            
            // Печатаем слово по буквам
            await this.typeWordByChar(word);
            
            // Добавляем пробел между словами (кроме последнего)
            if (wordIndex < words.length - 1) {
                console.log('📝 Добавляем пробел между словами');
                await this.typeCharacter(' ');
                await this.delay(500); // Короткая пауза после пробела
            }
        }
        
        console.log('✅ ВСЕ СЛОВА напечатаны полностью!');
        this.stopTyping();
    }

    /**
     * Печатает слово по одной букве за раз
     */
    async typeWordByChar(word) {
        console.log(`⌨️ Начинаем печать слова "${word}" по буквам`);
        
        for (let i = 0; i < word.length; i++) {
            if (!this.typingState.isRunning) {
                console.log('🛑 Печать остановлена');
                break;
            }
            
            const char = word[i];
            console.log(`📝 Печатаем букву: "${char}" (${i + 1}/${word.length})`);
            
            // Печатаем букву через keyboard events
            await this.typeCharacter(char);
            
            // Обновляем состояние
            this.typingState.currentCharIndex = i + 1;
            
            // Пауза 1 секунда между буквами
            if (i < word.length - 1) {
                console.log('⏳ Ждем 1 секунду...');
                await this.delay(1000);
            }
        }
        
        console.log(`✅ Слово "${word}" напечатано полностью`);
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
    stopTyping() {
        console.log('🛑 Остановка печати');
        this.typingState.isRunning = false;
        this.typingState.currentWordIndex = 0;
        this.typingState.currentCharIndex = 0;
        this.typingState.wordsToType = [];
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
