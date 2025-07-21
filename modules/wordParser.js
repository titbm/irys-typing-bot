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
        
        // Флаг для отслеживания состояния игры
        this.gameEnded = false;
        this.gameEndCallback = null;
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

    /**
     * Ищет и нажимает кнопку "Submit to leaderboard"
     */
    clickSubmitButton() {
        console.log('🔍 Ищем кнопку Submit to Leaderboard...');
        
        // Ищем все кнопки
        const buttons = document.querySelectorAll('button');
        console.log(`📱 Найдено ${buttons.length} кнопок`);
        
        for (const button of buttons) {
            const text = button.textContent?.toLowerCase() || '';
            console.log(`🔍 Проверяем: "${text.substring(0, 50)}"`);
            
            if ((text.includes('submit') && text.includes('leaderboard')) || 
                (text.includes('connect') && text.includes('okx'))) {
                console.log('✅ НАЙДЕНА КНОПКА!');
                try {
                    button.click();
                    console.log('🎯 КНОПКА НАЖАТА!');
                    return true;
                } catch (e) {
                    console.log('❌ Ошибка нажатия:', e);
                }
            }
        }
        
        console.log('❌ Кнопка не найдена');
        return false;
    }

    /**
     * Начинает отслеживание окончания игры (прямой мониторинг DOM)
     */
    startGameEndMonitoring(callback) {
        console.log('👀 Начинаем мониторинг окончания игры...');
        
        this.gameEndCallback = callback;
        
        // СБРАСЫВАЕМ состояние для новой игры
        this.gameEnded = false;
        
        // Останавливаем предыдущий мониторинг если он есть
        if (this.gameMonitorInterval) {
            clearInterval(this.gameMonitorInterval);
        }
        
        // Прямой мониторинг DOM каждые 100ms
        this.gameMonitorInterval = setInterval(() => {
            this.checkGameEnd();
        }, 100);
        
        console.log('🎧 Мониторинг DOM настроен для новой игры');
    }

    /**
     * Проверяет окончание игры по DOM
     */
    checkGameEnd() {
        if (this.gameEnded) return;
        
        // Ищем popup с результатами
        const gameResultsHeading = document.querySelector('h2');
        if (gameResultsHeading && gameResultsHeading.textContent?.trim() === 'Game Results') {
            console.log('🎮 ИГРА ЗАКОНЧЕНА! Найден popup с результатами');
            this.handleGameEnd();
            return;
        }
        
        // Ищем текст "Game finished!"
        const gameFinishedText = document.querySelector('*');
        if (gameFinishedText) {
            const allText = document.body.textContent || '';
            if (allText.includes('Game finished!')) {
                console.log('🎮 ИГРА ЗАКОНЧЕНА! Найден текст Game finished!');
                this.handleGameEnd();
                return;
            }
        }
    }

    /**
     * Обрабатывает окончание игры
     */
    handleGameEnd() {
        if (this.gameEnded) return;
        
        console.log('🏁 ОБРАБАТЫВАЕМ ОКОНЧАНИЕ ИГРЫ...');
        this.gameEnded = true;
        
        // Останавливаем мониторинг СРАЗУ
        if (this.gameMonitorInterval) {
            clearInterval(this.gameMonitorInterval);
            this.gameMonitorInterval = null;
            console.log('🛑 Мониторинг остановлен');
        }
        
        // СРАЗУ останавливаем печать
        if (this.gameEndCallback) {
            console.log('🛑 ОСТАНАВЛИВАЕМ ПЕЧАТЬ!');
            this.gameEndCallback();
            console.log('✅ Печать остановлена');
        }
        
        // Пробуем нажать кнопку с умными попытками
        this.attemptClickSubmit(0);
    }

    /**
     * Пытается нажать кнопку Submit с остановкой при успехе
     */
    attemptClickSubmit(attempt) {
        if (attempt >= 3) {
            console.log('❌ Все попытки нажатия кнопки исчерпаны');
            // Вызываем callback о завершении игры
            if (this.gameEndCallback) {
                this.gameEndCallback();
            }
            return;
        }
        
        const delay = [500, 1500, 3000][attempt];
        setTimeout(() => {
            if (this.clickSubmitButton()) {
                console.log('✅ Кнопка успешно нажата, больше попыток не нужно');
                
                // Вызываем callback о завершении игры
                if (this.gameEndCallback) {
                    this.gameEndCallback();
                }
                return;
            }
            
            // Пробуем еще раз только если предыдущая попытка не удалась
            this.attemptClickSubmit(attempt + 1);
        }, delay);
    }

    /**
     * Останавливает мониторинг окончания игры
     */
    stopGameEndMonitoring() {
        console.log('🛑 Останавливаем мониторинг окончания игры');
        
        // Останавливаем интервал мониторинга
        if (this.gameMonitorInterval) {
            clearInterval(this.gameMonitorInterval);
            this.gameMonitorInterval = null;
        }
        
        // Сбрасываем состояние
        this.gameEndCallback = null;
        this.gameEnded = false;
        
        console.log('✅ Мониторинг полностью остановлен, готов к новой игре');
    }
}

// Экспорт для использования в других модулях
window.WordParser = WordParser;
