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
                    this.startAutomation(message.settings);
                    sendResponse({ success: true });
                    break;
                    
                case 'STOP_AUTOMATION':
                    this.stopAutomation();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    console.log('❓ Неизвестный тип сообщения:', message.type);
            }
        });
    }

    /**
     * Запускает автоматическую печать
     */
    async startAutomation(settings) {
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
            
            // Запускаем печать через движок
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
}

// Создаем парсер
const parser = new SpriteTypeParser();

// Экспорт для отладки
window.parser = parser;
window.spriteTypeParser = parser;
