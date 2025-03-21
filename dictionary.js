/**
 * 自訂字典管理模組
 * 用於管理、儲存和應用台灣用語的轉換詞彙
 * 此字典專注於處理繁體中文詞彙間的用語差異，例如「設置」→「設定」
 * 注意：此字典在OpenCC簡繁轉換後使用，因此僅處理繁體字詞間的差異
 */
class CustomDictionary {
    constructor() {
        // 字典内容，格式：{ 簡體詞: 正體詞 }
        this.entries = {};
        
        // 從localStorage載入先前保存的字典
        this.loadFromStorage();
        
        try {
            // DOM元素
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
        } catch (error) {
            console.error('初始化字典時發生錯誤:', error);
            // 仍然允許基本字典功能工作 - 只是沒有 UI
        }
    }
    
    // 初始化事件監聽器
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
        this.importDictionaryBtn.addEventListener('click', () => {
            this.dictionaryFileInput.click();
        });
        
        this.dictionaryFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importDictionary(file);
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
        this.traditionalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEntry();
            }
        });
        
        // 載入預設字典
        this.loadDefaultDictionaryBtn.addEventListener('click', () => {
            this.loadDefaultDictionary();
        });
    }
    
    // 從localStorage載入字典
    loadFromStorage() {
        const savedDict = localStorage.getItem('customDictionary');
        if (savedDict) {
            try {
                this.entries = JSON.parse(savedDict);
            } catch (error) {
                console.error('載入字典時發生錯誤:', error);
                this.entries = {};
            }
        }
    }
    
    // 儲存字典到localStorage
    saveToStorage() {
        localStorage.setItem('customDictionary', JSON.stringify(this.entries));
    }
    
    // 新增字典項目
    addEntry() {
        const simplified = this.simplifiedInput.value.trim();
        const traditional = this.traditionalInput.value.trim();
        
        if (simplified && traditional) {
            this.entries[simplified] = traditional;
            this.saveToStorage();
            this.updateDictionaryUI();
            
            // 清空輸入框
            this.simplifiedInput.value = '';
            this.traditionalInput.value = '';
            this.simplifiedInput.focus();
        } else {
            alert('請輸入簡體和正體詞彙！');
        }
    }
    
    // 移除字典項目
    removeEntry(simplified) {
        if (this.entries[simplified]) {
            delete this.entries[simplified];
            this.saveToStorage();
            this.updateDictionaryUI();
        }
    }
    
    // 更新字典UI顯示
    updateDictionaryUI() {
        // 清空現有項目
        this.dictionaryEntries.innerHTML = '';
        
        // 如果字典為空，顯示提示
        if (Object.keys(this.entries).length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'dictionary-entry';
            emptyMsg.innerHTML = '<div class="dict-col" style="text-align: center; color: #666;">字典目前是空的，請添加詞彙</div><div class="dict-col"></div><div class="dict-col"></div>';
            this.dictionaryEntries.appendChild(emptyMsg);
            return;
        }
        
        // 創建並添加所有字典項目
        for (const simplified in this.entries) {
            const traditional = this.entries[simplified];
            
            const entry = document.createElement('div');
            entry.className = 'dictionary-entry';
            
            const simplifiedCol = document.createElement('div');
            simplifiedCol.className = 'dict-col';
            simplifiedCol.textContent = simplified;
            
            const traditionalCol = document.createElement('div');
            traditionalCol.className = 'dict-col';
            traditionalCol.textContent = traditional;
            
            const actionCol = document.createElement('div');
            actionCol.className = 'dict-col';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '刪除';
            deleteBtn.addEventListener('click', () => {
                this.removeEntry(simplified);
            });
            
            actionCol.appendChild(deleteBtn);
            
            entry.appendChild(simplifiedCol);
            entry.appendChild(traditionalCol);
            entry.appendChild(actionCol);
            
            this.dictionaryEntries.appendChild(entry);
        }
    }
    
    // 匯入字典
    importDictionary(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const dict = JSON.parse(e.target.result);
                
                // 合併字典
                this.entries = { ...this.entries, ...dict };
                this.saveToStorage();
                this.updateDictionaryUI();
                
                alert(`成功匯入字典，共 ${Object.keys(dict).length} 個項目`);
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
    
    // 匯出字典
    exportDictionary() {
        if (Object.keys(this.entries).length === 0) {
            alert('字典目前是空的，沒有內容可匯出');
            return;
        }
        
        const dictContent = JSON.stringify(this.entries, null, 2);
        const blob = new Blob([dictContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom_dictionary.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 載入預設字典
    loadDefaultDictionary() {
        fetch('default_dictionary.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法載入預設字典檔案');
                }
                return response.json();
            })
            .then(dict => {
                if (Object.keys(this.entries).length > 0) {
                    if (!confirm('這將會覆蓋或合併現有字典內容，確定要繼續嗎？')) {
                        return;
                    }
                }
                
                // 合併字典
                this.entries = { ...this.entries, ...dict };
                this.saveToStorage();
                this.updateDictionaryUI();
                
                alert(`成功載入預設字典，共 ${Object.keys(dict).length} 個項目`);
            })
            .catch(error => {
                console.error('載入預設字典時發生錯誤:', error);
                alert('載入預設字典時發生錯誤: ' + error.message);
            });
    }
    
    // 應用字典進行轉換
    convertWithDictionary(text) {
        if (!text) return '';
        
        try {
            let result = text;
            
            // 先應用字典中的精確詞彙替換
            for (const simplified in this.entries) {
                if (!simplified) continue;
                
                const traditional = this.entries[simplified];
                if (!traditional) continue;
                
                try {
                    // 使用全局正則表達式進行替換
                    const regex = new RegExp(this.escapeRegExp(simplified), 'g');
                    result = result.replace(regex, traditional);
                } catch (regexError) {
                    console.warn(`轉換「${simplified}」時發生錯誤，已跳過:`, regexError);
                }
            }
            
            return result;
        } catch (error) {
            console.error('字典轉換時發生錯誤:', error);
            // 發生錯誤時返回原始文本
            return text;
        }
    }
    
    // 轉義正則表達式特殊字符
    escapeRegExp(string) {
        if (!string || typeof string !== 'string') return '';
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// 創建並導出字典實例
const customDictionary = new CustomDictionary(); 