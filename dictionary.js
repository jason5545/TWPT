/**
 * 自訂字典管理模組
 * 用於管理、儲存和應用台灣用語的轉換詞彙
 * 此字典專注於處理繁體中文詞彙間的用語差異，例如「設置」→「設定」
 * 注意：此字典在OpenCC簡繁轉換後使用，因此僅處理繁體字詞間的差異
 * @version 1.1.0
 */
class CustomDictionary {
    constructor() {
        // 字典内容，格式：{ 原詞: 轉換詞 }
        this.entries = {};
        
        // 排序詞彙的快取
        this._sortedEntries = null;
        
        // 從localStorage載入先前保存的字典
        this.loadFromStorage();
        
        try {
            // DOM元素
            this.initUI();
        } catch (error) {
            console.error('初始化字典UI時發生錯誤:', error);
            // 仍然允許基本字典功能工作 - 只是沒有 UI
        }
    }
    
    /**
     * 初始化UI元素和事件
     */
    initUI() {
        // 獲取DOM元素
        this.showDictionaryBtn = document.getElementById('showDictionaryBtn');
        this.importDictionaryBtn = document.getElementById('importDictionaryBtn');
        this.exportDictionaryBtn = document.getElementById('exportDictionaryBtn');
        this.dictionaryFileInput = document.getElementById('dictionaryFileInput');
        this.dictionaryEditor = document.getElementById('dictionaryEditor');
        this.dictionaryEntries = document.getElementById('dictionaryEntries');
        this.simplifiedInput = document.getElementById('simplifiedInput');
        this.traditionalInput = document.getElementById('traditionalInput');
        this.addDictionaryEntryBtn = document.getElementById('addDictionaryEntryBtn');
        this.loadDefaultDictionaryBtn = document.getElementById('loadDefaultDictionaryBtn');
        
        // 檢查是否有找到所有必要元素
        const requiredElements = [
            this.showDictionaryBtn, this.dictionaryEntries, 
            this.dictionaryEditor, this.simplifiedInput, 
            this.traditionalInput, this.addDictionaryEntryBtn,
            this.loadDefaultDictionaryBtn
        ];
        
        const allElementsFound = requiredElements.every(el => el !== null);
        
        if (!allElementsFound) {
            console.warn('字典 UI 元素未完全找到，某些功能可能受限');
        } else {
            // 初始化事件監聽器
            this.initEventListeners();
            
            // 更新UI顯示
            this.updateDictionaryUI();
        }
    }
    
    /**
     * 初始化事件監聽器
     */
    initEventListeners() {
        // 顯示/隱藏字典編輯器
        this.showDictionaryBtn.addEventListener('click', () => {
            if (this.dictionaryEditor.style.display === 'none') {
                this.dictionaryEditor.style.display = 'block';
                this.showDictionaryBtn.textContent = '隱藏字典';
            } else {
                this.dictionaryEditor.style.display = 'none';
                this.showDictionaryBtn.textContent = '管理字典';
            }
        });
        
        // 匯入字典
        this.importDictionaryBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.dictionaryFileInput.click();
        });
        
        this.dictionaryFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importDictionary(file);
                // 重設檔案輸入，允許重複選擇相同的檔案
                this.dictionaryFileInput.value = '';
            }
        });
        
        // 匯出字典
        this.exportDictionaryBtn.addEventListener('click', () => {
            this.exportDictionary();
        });
        
        // 新增字典項目
        this.addDictionaryEntryBtn.addEventListener('click', () => {
            this.addEntry();
        });
        
        // 按Enter鍵也可以新增項目
        const handleEnterKey = (e) => {
            if (e.key === 'Enter') {
                this.addEntry();
            }
        };
        
        this.simplifiedInput.addEventListener('keypress', handleEnterKey);
        this.traditionalInput.addEventListener('keypress', handleEnterKey);
        
        // 載入預設字典
        this.loadDefaultDictionaryBtn.addEventListener('click', () => {
            this.loadDefaultDictionary();
        });
    }
    
    /**
     * 從localStorage載入字典
     */
    loadFromStorage() {
        try {
            const savedDict = localStorage.getItem('customDictionary');
            if (savedDict) {
                this.entries = JSON.parse(savedDict);
                // 重設排序詞彙快取
                this._sortedEntries = null;
            }
        } catch (error) {
            console.error('載入字典時發生錯誤:', error);
            this.entries = {};
        }
    }
    
    /**
     * 儲存字典到localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('customDictionary', JSON.stringify(this.entries));
            // 重設排序詞彙快取
            this._sortedEntries = null;
        } catch (error) {
            console.error('儲存字典時發生錯誤:', error);
            alert('儲存字典時發生錯誤，可能是儲存空間已滿，請嘗試清理瀏覽器儲存空間');
        }
    }
    
    /**
     * 新增字典項目
     * @returns {boolean} 是否成功新增
     */
    addEntry() {
        const simplified = this.simplifiedInput.value.trim();
        const traditional = this.traditionalInput.value.trim();
        
        if (simplified && traditional) {
            // 檢查是否已存在相同的項目
            if (this.entries[simplified] === traditional) {
                alert('此詞彙對已存在於字典中');
                return false;
            }
            
            this.entries[simplified] = traditional;
            this.saveToStorage();
            this.updateDictionaryUI();
            
            // 清空輸入框
            this.simplifiedInput.value = '';
            this.traditionalInput.value = '';
            this.simplifiedInput.focus();
            return true;
        } else {
            alert('請輸入原始詞彙和台灣用語！');
            return false;
        }
    }
    
    /**
     * 移除字典項目
     * @param {string} key - 要移除的詞彙關鍵字
     * @returns {boolean} 是否成功移除
     */
    removeEntry(key) {
        if (this.entries[key]) {
            delete this.entries[key];
            this.saveToStorage();
            this.updateDictionaryUI();
            return true;
        }
        return false;
    }
    
    /**
     * 批次新增多個字典項目
     * @param {Object} entries - 字典項目對象
     * @returns {number} 成功新增的項目數量
     */
    addEntries(entries) {
        if (!entries || typeof entries !== 'object') {
            return 0;
        }
        
        let count = 0;
        for (const [key, value] of Object.entries(entries)) {
            if (key && value && typeof key === 'string' && typeof value === 'string') {
                this.entries[key] = value;
                count++;
            }
        }
        
        if (count > 0) {
            this.saveToStorage();
            this.updateDictionaryUI();
        }
        
        return count;
    }
    
    /**
     * 清空字典
     * @returns {boolean} 是否成功清空
     */
    clearDictionary() {
        const entryCount = Object.keys(this.entries).length;
        if (entryCount === 0) {
            return false;
        }
        
        this.entries = {};
        this.saveToStorage();
        this.updateDictionaryUI();
        return true;
    }
    
    /**
     * 更新字典UI顯示
     */
    updateDictionaryUI() {
        // 確保DOM元素存在
        if (!this.dictionaryEntries) {
            return;
        }
        
        // 清空現有項目
        this.dictionaryEntries.innerHTML = '';
        
        // 獲取排序後的詞彙陣列 (按字元長度降序排列，長詞優先匹配)
        const sortedKeys = this.getSortedEntries();
        
        // 如果字典為空，顯示提示
        if (sortedKeys.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'dictionary-entry';
            emptyMsg.innerHTML = '<div class="dict-col" style="text-align: center; color: var(--text-light);">字典目前是空的，請添加詞彙</div><div class="dict-col"></div><div class="dict-col"></div>';
            this.dictionaryEntries.appendChild(emptyMsg);
            return;
        }
        
        // 創建並添加所有字典項目
        const fragment = document.createDocumentFragment();
        
        for (const key of sortedKeys) {
            const value = this.entries[key];
            
            const entry = document.createElement('div');
            entry.className = 'dictionary-entry';
            
            const keyCol = document.createElement('div');
            keyCol.className = 'dict-col';
            keyCol.textContent = key;
            
            const valueCol = document.createElement('div');
            valueCol.className = 'dict-col';
            valueCol.textContent = value;
            
            const actionCol = document.createElement('div');
            actionCol.className = 'dict-col';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '刪除';
            deleteBtn.addEventListener('click', () => {
                this.removeEntry(key);
            });
            
            actionCol.appendChild(deleteBtn);
            
            entry.appendChild(keyCol);
            entry.appendChild(valueCol);
            entry.appendChild(actionCol);
            
            fragment.appendChild(entry);
        }
        
        this.dictionaryEntries.appendChild(fragment);
    }
    
    /**
     * 獲取排序後的詞彙陣列（按字元長度降序排列）
     * @returns {Array} 排序後的詞彙陣列
     */
    getSortedEntries() {
        // 使用快取避免重複排序
        if (this._sortedEntries) {
            return this._sortedEntries;
        }
        
        this._sortedEntries = Object.keys(this.entries).sort((a, b) => b.length - a.length);
        return this._sortedEntries;
    }
    
    /**
     * 匯入字典
     * @param {File} file - 字典JSON檔案
     */
    importDictionary(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const dict = JSON.parse(e.target.result);
                
                // 計算新增和更新的條目數
                let newCount = 0;
                let updatedCount = 0;
                
                for (const [key, value] of Object.entries(dict)) {
                    if (key && value) {
                        if (this.entries[key] === undefined) {
                            newCount++;
                        } else if (this.entries[key] !== value) {
                            updatedCount++;
                        }
                        this.entries[key] = value;
                    }
                }
                
                this.saveToStorage();
                this.updateDictionaryUI();
                
                if (newCount > 0 || updatedCount > 0) {
                    alert(`成功匯入字典：新增 ${newCount} 個項目，更新 ${updatedCount} 個項目`);
                } else {
                    alert('匯入完成，但沒有新增或更新任何項目');
                }
            } catch (error) {
                console.error('匯入字典時發生錯誤:', error);
                alert('匯入字典時發生錯誤，請確保檔案格式正確');
            }
        };
        
        reader.onerror = () => {
            alert('讀取檔案時發生錯誤');
        };
        
        reader.readAsText(file);
    }
    
    /**
     * 匯出字典
     */
    exportDictionary() {
        const entryCount = Object.keys(this.entries).length;
        
        if (entryCount === 0) {
            alert('字典目前是空的，沒有內容可匯出');
            return;
        }
        
        try {
            const dictContent = JSON.stringify(this.entries, null, 2);
            const blob = new Blob([dictContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `custom_dictionary_${this.getFormattedDate()}.json`;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
        } catch (error) {
            console.error('匯出字典時發生錯誤:', error);
            alert('匯出字典時發生錯誤: ' + error.message);
        }
    }
    
    /**
     * 獲取格式化的當前日期（用於匯出檔名）
     * @returns {string} 格式化的日期字串，如 20230615
     */
    getFormattedDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    
    /**
     * 載入預設字典
     */
    loadDefaultDictionary() {
        fetch('default_dictionary.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法載入預設字典檔案');
                }
                return response.json();
            })
            .then(data => {
                // 計算新增和更新的條目數
                let newCount = 0;
                let updatedCount = 0;
                
                for (const [key, value] of Object.entries(data)) {
                    if (this.entries[key] === undefined) {
                        newCount++;
                    } else if (this.entries[key] !== value) {
                        updatedCount++;
                    }
                    this.entries[key] = value;
                }
                
                this.saveToStorage();
                this.updateDictionaryUI();
                
                if (newCount > 0 || updatedCount > 0) {
                    alert(`成功載入預設字典：新增 ${newCount} 個項目，更新 ${updatedCount} 個項目`);
                } else {
                    alert('載入完成，但沒有新增或更新任何項目');
                }
            })
            .catch(error => {
                console.error('載入預設字典時發生錯誤:', error);
                alert('載入預設字典時發生錯誤: ' + error.message);
            });
    }
    
    /**
     * 使用字典轉換文字
     * @param {string} text - 要轉換的文字
     * @returns {string} 轉換後的文字
     */
    convertWithDictionary(text) {
        if (!text || typeof text !== 'string' || text.length === 0) {
            return text;
        }
        
        // 獲取排序後的詞彙（按長度降序，確保長詞優先匹配）
        const sortedKeys = this.getSortedEntries();
        
        // 如果字典為空，直接返回原文
        if (sortedKeys.length === 0) {
            return text;
        }
        
        let result = text;
        
        // 對每個詞彙進行替換
        for (const key of sortedKeys) {
            if (!key || key.length === 0) continue;
            
            const value = this.entries[key];
            if (!value || value === key) continue;
            
            // 使用正則表達式替換所有匹配項
            // 使用 RegExp 構建正則表達式，g 標誌表示全局匹配
            const regex = new RegExp(this.escapeRegExp(key), 'g');
            result = result.replace(regex, value);
        }
        
        return result;
    }
    
    /**
     * 轉義正則表達式特殊字符
     * @param {string} string - 需要轉義的字串
     * @returns {string} 轉義後的字串
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * 獲取字典統計信息
     * @returns {Object} 字典統計信息
     */
    getStats() {
        const entryCount = Object.keys(this.entries).length;
        
        if (entryCount === 0) {
            return {
                entryCount: 0,
                isEmpty: true,
                hasCustomEntries: false
            };
        }
        
        return {
            entryCount,
            isEmpty: false,
            hasCustomEntries: true
        };
    }
}

// 創建並導出字典實例
const customDictionary = new CustomDictionary();

// 如果在瀏覽器環境中，將實例添加到全局範圍以供外部訪問
if (typeof window !== 'undefined') {
    window.customDictionary = customDictionary;
} 