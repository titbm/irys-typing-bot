/**
 * ГЛАВНЫЙ КООРДИНАТОР ДЛЯ SPRITETYPE.IRYS.XYZ
 * Объединяет парсер слов и движок печати
 */

console.log('🎯 SpriteType Parser загружен');

class SpriteTypeParser {
    constructor() {
        // Инициализируем модули
        this.wordParser = new WordParser();
        this.typingEngine = new TypingEngine();
        
        this.initialize();
    }

    initialize() {
        console.log('🎯 Инициализация SpriteTypeParser');
        
        if (!window.location.href.includes('spritetype.irys.xyz')) {
            console.log('❌ Неправильный сайт');
            return;
        }

        // Тестируем парсер через 2 секунды
        setTimeout(() => this.wordParser.testParser(), 2000);
        
        // Настраиваем обработчики сообщений
        this.setupMessageHandlers();
        
        // Отправляем сигнал готовности в background
        this.sendMessage('CONTENT_READY');
        
        console.log('✅ SpriteTypeParser готов');
    }

    sendMessage(type, data = {}) {
        chrome.runtime.sendMessage({ type, ...data }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('⚠️ Ошибка отправки сообщения:', chrome.runtime.lastError);
            }
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Получено сообщение:', message.type);
            
            switch (message.type) {
                case 'START_AUTOMATION':
                    this.startAutomation();
                    sendResponse({ success: true });
                    break;
                    
                case 'STOP_AUTOMATION':
                    this.stopAutomation();
                    sendResponse({ success: true });
                    break;

                case 'RESTORE_AUTOMATION':
                    this.restoreAutomation(message.gameState);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    console.log('❓ Неизвестный тип сообщения:', message.type);
            }
        });
    }

    /**
     * Запускает автоматическую печать (используется фиксированная высокая натуральность)
     */
    async startAutomation() {
        if (this.typingEngine.isRunning()) {
            console.log('⚠️ Печать уже запущена');
            return;
        }

        console.log('🚀 Запуск автоматической печати');
        
        try {
            // Парсим слова
            const words = this.wordParser.parseWords();
            if (words.length === 0) {
                throw new Error('Слова для печати не найдены');
            }

            // Берем ВСЕ слова для печати
            const allWordsText = words.map(w => w.text);
            console.log(`📝 Будем печатать ВСЕ слова: ${allWordsText.join(', ')}`);
            console.log(`📊 Общее количество слов: ${allWordsText.length}`);
            
            // Запускаем мониторинг окончания игры
            this.startGameEndMonitoring();
            
            // Даем время на подготовку перед началом печати
            console.log('⏳ Подготовка к печати...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда подготовки
            
            // Запускаем печать через движок (используется фиксированная высокая натуральность)
            await this.typingEngine.startTyping(allWordsText);
            
        } catch (error) {
            console.error('❌ Ошибка автоматической печати:', error);
            this.stopAutomation();
        }
    }

    /**
     * Останавливает автоматизацию
     */
    stopAutomation() {
        console.log('🛑 Остановка автоматизации');
        this.typingEngine.stopTyping();
        this.stopGameEndMonitoring();
    }

    /**
     * Запускает мониторинг окончания игры
     */
    startGameEndMonitoring() {
        console.log('👀 Запускаем мониторинг окончания игры...');
        
        this.wordParser.startGameEndMonitoring(() => {
            console.log('🏁 ИГРА ЗАКОНЧЕНА! Останавливаем печать...');
            
            // Принудительно останавливаем печать
            this.typingEngine.forceStop();
            
            // Уведомляем background script об окончании игры
            this.sendMessage('GAME_ENDED', {
                message: 'Игра закончена, автоматически нажата кнопка Submit'
            });

            // Запускаем автоматический переход к следующей игре через увеличенную задержку
            setTimeout(() => {
                this.startNextGame();
            }, 2500); // Увеличено с 1500 до 2500ms для натуральности
        });
    }

    /**
     * Останавливает мониторинг окончания игры
     */
    stopGameEndMonitoring() {
        console.log('🛑 Останавливаем мониторинг окончания игры');
        this.wordParser.stopGameEndMonitoring();
    }

    // Делегируем методы парсера
    parseWords() {
        return this.wordParser.parseWords();
    }

    getGameState() {
        return this.wordParser.getGameState();
    }

    getCurrentWord() {
        return this.wordParser.getCurrentWord();
    }

    getWordsToType() {
        return this.wordParser.getWordsToType();
    }

    // Делегируем методы движка печати
    getTypingState() {
        return this.typingEngine.getState();
    }

    isTyping() {
        return this.typingEngine.isRunning();
    }

    /**
     * Восстанавливает автоматизацию после перезагрузки страницы
     * Используется для продолжения игры при многоигровом режиме
     */
    async restoreAutomation(gameState) {
        console.log('🔄 Начали игру:', gameState);
        
        if (!gameState || !gameState.isRunning) {
            console.log('❌ Нет активного состояния для восстановления');
            return;
        }

        // Уведомляем background о готовности к восстановлению
        this.sendMessage('AUTOMATION_RESTORE_READY', {
            currentGame: gameState.currentGame,
            totalGames: gameState.totalGames
        });

        // Ждем загрузки игры перед запуском автоматизации
        await this.waitForGameReady();

        try {
            console.log(`🎮 Запускаем игру ${gameState.currentGame} из ${gameState.totalGames}`);
            
            // Запускаем автоматизацию (используется фиксированная высокая натуральность)
            await this.startAutomation();
            
        } catch (error) {
            console.error('❌ Ошибка восстановления автоматизации:', error);
            this.sendMessage('AUTOMATION_ERROR', {
                error: error.message,
                currentGame: gameState.currentGame
            });
        }
    }

    /**
     * Ждет полной загрузки игры перед запуском автоматизации
     */
    async waitForGameReady() {
        console.log('⏳ Ожидание готовности игры...');
        
        let attempts = 0;
        const maxAttempts = 20; // 10 секунд максимум
        
        while (attempts < maxAttempts) {
            try {
                // Проверяем, что игра загружена
                const words = this.wordParser.parseWords();
                if (words && words.length > 0) {
                    console.log('✅ Игра готова, найдено слов:', words.length);
                    return true;
                }
            } catch (error) {
                // Игра еще не готова
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('Превышено время ожидания загрузки игры');
    }

    /**
     * Автоматически запускает следующую игру
     * Вызывается после завершения текущей игры
     */
    async startNextGame() {
        console.log('🎯 Попытка автоматического запуска следующей игры...');
        
        try {
            // Даем больше времени на обработку результатов текущей игры
            await new Promise(resolve => setTimeout(resolve, 3500)); // Увеличено с 2000 до 3500ms
            
            // Ищем кнопку "Play Again" или "New Game"
            const playAgainButton = this.findPlayAgainButton();
            
            if (playAgainButton) {
                console.log('✅ Найдена кнопка для новой игры, кликаем...');
                playAgainButton.click();
                
                // Уведомляем background о переходе к следующей игре
                this.sendMessage('NEXT_GAME_STARTED');
                
                return true;
            } else {
                console.log('❌ Кнопка новой игры не найдена');
                console.log('🔄 Пробуем перезагрузить страницу через 7 секунд...');
                
                // Если кнопки нет, ждем больше времени и перезагружаем страницу
                setTimeout(() => {
                    console.log('🔄 Перезагружаем страницу для новой игры...');
                    window.location.reload();
                }, 7000); // Увеличили паузу с 5000 до 7000ms
                
                return true;
            }
            
        } catch (error) {
            console.error('❌ Ошибка запуска следующей игры:', error);
            
            // В случае ошибки тоже перезагружаем страницу, но с большей паузой
            setTimeout(() => {
                console.log('🔄 Перезагружаем страницу из-за ошибки...');
                window.location.reload();
            }, 6000); // Увеличили паузу с 4000 до 6000ms
            
            return false;
        }
    }

    /**
     * Ищет кнопку для запуска новой игры
     */
    findPlayAgainButton() {
        // Список возможных селекторов для кнопки новой игры
        const buttonSelectors = [
            'button[onclick*="newGame"]',
            'button[onclick*="playAgain"]',
            'button[onclick*="restart"]',
            '.play-again',
            '.new-game',
            '.restart-button',
            'button:contains("Play Again")',
            'button:contains("New Game")',
            'button:contains("Restart")',
            'button:contains("Начать заново")',
            'button:contains("Новая игра")'
        ];

        for (const selector of buttonSelectors) {
            try {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) { // проверяем что кнопка видима
                    return button;
                }
            } catch (e) {
                // Игнорируем ошибки селекторов с :contains (не поддерживается в querySelector)
                continue;
            }
        }

        // Если не нашли по селекторам, ищем по тексту
        const allButtons = document.querySelectorAll('button, input[type="button"], .btn');
        for (const button of allButtons) {
            const text = button.textContent || button.value || '';
            if (text.match(/(play again|new game|restart|начать заново|новая игра)/i)) {
                if (button.offsetParent !== null) { // проверяем что кнопка видима
                    return button;
                }
            }
        }

        return null;
    }
}

// Создаем парсер
const parser = new SpriteTypeParser();

// Экспорт для отладки
window.parser = parser;
window.spriteTypeParser = parser;
