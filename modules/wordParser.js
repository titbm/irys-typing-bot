/**
 * МОДУЛЬ ПАРСИНГА СЛОВ ДЛЯ SPRITETYPE.IRYS.XYZ
 * Отвечает за извлечение и анализ слов на странице
 */

class WordParser {
    constructor() {
        this.gameSelectors = {
            // Контейнер с игрой
            gameContainer: 'main .relative.flex.items-center.justify-start',
            // Текущее слово (белое, крупное)
            currentWord: 'div.text-4xl.font-medium.text-white',
            // Остальные слова (серые, мелкие)
            nextWords: 'div.text-3xl.font-medium',
            // Скрытое поле ввода
            input: 'input[type="text"]',
            // Кнопки времени
            timeButtons: 'button'
        };
    }

    /**
     * Находит основной контейнер с игрой
     */
    findGameContainer() {
        const container = document.querySelector(this.gameSelectors.gameContainer);
        if (!container) {
            throw new Error('Игровой контейнер не найден');
        }
        return container;
    }

    /**
     * Парсит все слова в правильном порядке
     */
    parseWords() {
        const gameContainer = this.findGameContainer();
        const words = [];
        
        // 1. Ищем текущее слово (белое)
        const currentWordElement = gameContainer.querySelector(this.gameSelectors.currentWord);
        if (currentWordElement) {
            const currentText = this.extractWordText(currentWordElement);
            if (currentText) {
                words.push({
                    text: currentText,
                    type: 'current',
                    element: currentWordElement
                });
            }
        }
        
        // 2. Ищем следующие слова (серые)
        const nextWordElements = gameContainer.querySelectorAll(this.gameSelectors.nextWords);
        nextWordElements.forEach(element => {
            const text = this.extractWordText(element);
            if (text && text.length > 2) {
                words.push({
                    text: text,
                    type: 'next',
                    element: element
                });
            }
        });
        
        return words;
    }

    /**
     * Извлекает текст слова и валидирует его
     */
    extractWordText(element) {
        const text = element.textContent?.trim();
        if (!text) return null;
        
        // Проверяем что это валидное английское слово
        if (!/^[a-zA-Z]+$/.test(text)) return null;
        if (text.length < 1 || text.length > 25) return null;
        
        return text;
    }

    /**
     * Находит скрытое поле ввода
     */
    findInput() {
        const input = document.querySelector(this.gameSelectors.input);
        if (!input) {
            throw new Error('Поле ввода не найдено');
        }
        return input;
    }

    /**
     * Находит кнопки времени
     */
    findTimeButtons() {
        const buttons = Array.from(document.querySelectorAll(this.gameSelectors.timeButtons));
        return buttons.filter(btn => {
            const text = btn.textContent?.trim();
            return text && /^(15|30|60|120)$/.test(text);
        });
    }

    /**
     * Устанавливает режим времени
     */
    setTimeMode(seconds) {
        console.log(`⏱️ Устанавливаем режим ${seconds} секунд`);
        
        try {
            const buttons = this.findTimeButtons();
            const targetButton = buttons.find(btn => 
                btn.textContent?.trim() === seconds.toString()
            );
            
            if (targetButton) {
                targetButton.click();
                console.log(`✅ Режим ${seconds} секунд установлен`);
                return true;
            } else {
                console.log(`⚠️ Кнопка ${seconds} секунд не найдена`);
                return false;
            }
        } catch (error) {
            console.log('⚠️ Ошибка установки времени:', error.message);
            return false;
        }
    }

    /**
     * Получает актуальный список слов для печати
     */
    getWordsToType() {
        const words = this.parseWords();
        return words.map(w => w.text);
    }

    /**
     * Получает текущее слово для печати
     */
    getCurrentWord() {
        const words = this.parseWords();
        const currentWord = words.find(w => w.type === 'current');
        return currentWord ? currentWord.text : null;
    }

    /**
     * Полная информация о состоянии игры
     */
    getGameState() {
        return {
            words: this.parseWords(),
            currentWord: this.getCurrentWord(),
            totalWords: this.parseWords().length,
            input: this.findInput(),
            timeButtons: this.findTimeButtons().map(btn => btn.textContent?.trim())
        };
    }

    /**
     * Тестирует парсер
     */
    testParser() {
        console.log('🧪 === ТЕСТИРУЕМ ПАРСЕР ===');
        
        try {
            // Тест 1: Игровой контейнер
            const gameContainer = this.findGameContainer();
            console.log('✅ Игровой контейнер найден:', !!gameContainer);
            
            // Тест 2: Парсим слова
            const words = this.parseWords();
            console.log('✅ Спарсено слов:', words.length);
            console.log('📝 Слова:', words.map(w => `${w.text}(${w.type})`).join(', '));
            
            // Тест 3: Поле ввода
            const input = this.findInput();
            console.log('✅ Поле ввода найдено:', !!input);
            console.log('📱 Input класс:', input?.className || 'НЕТ');
            
            // Тест 4: Кнопки времени
            const timeButtons = this.findTimeButtons();
            console.log('✅ Кнопки времени:', timeButtons.map(b => b.textContent?.trim()));
            
            // Тест 5: Полное состояние игры
            const gameState = this.getGameState();
            console.log('🎮 Состояние игры:', {
                totalWords: gameState.totalWords,
                currentWord: gameState.currentWord,
                hasInput: !!gameState.input
            });
            
        } catch (error) {
            console.error('❌ Ошибка тестирования парсера:', error.message);
        }
        
        console.log('🧪 === ТЕСТ ЗАВЕРШЕН ===');
    }
}

// Экспорт для использования в других модулях
window.WordParser = WordParser;
