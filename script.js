// DOM元素
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressStatus = document.getElementById('progressStatus');
const resultContainer = document.getElementById('resultContainer');
const downloadBtn = document.getElementById('downloadBtn');

// 檔案及轉換相關變數
let uploadedFile = null;
let convertedFile = null;
let converter = null;

// 初始化OpenCC轉換器
function initConverter() {
    try {
        // 檢查 OpenCC 是否已定義
        if (typeof OpenCC === 'undefined') {
            throw new Error("OpenCC is not defined - 繁簡轉換庫無法載入");
        }
        
        // 使用正確的 API 格式初始化轉換器
        // 從簡體中文（中國大陸，'s'/'cn'）轉換為繁體中文（台灣，'tw'/'twp'）
        try {
            // 嘗試新版 API
            converter = OpenCC.Converter({ from: 'cn', to: 'twp' });
        } catch (e) {
            console.warn('新版 API 初始化失敗，嘗試替代方法:', e);
            
            // 嘗試替代的 API 形式
            if (typeof OpenCC.s2twp === 'function') {
                converter = function(text) { return OpenCC.s2twp(text); };
            } else if (typeof OpenCC.s2t === 'function') {
                converter = function(text) { return OpenCC.s2t(text); };
            } else {
                throw new Error('找不到適合的轉換函數');
            }
        }
    } catch (error) {
        console.error('初始化 OpenCC 轉換器時發生錯誤:', error);
        alert('無法初始化繁簡轉換器: ' + error.message + '\n請確認網路連線正常且能夠存取 CDN 資源。');
        resetUI();
    }
}

// 事件監聽器設定
function initEventListeners() {
    // 拖放區域事件
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    
    // 檔案選擇事件
    fileInput.addEventListener('change', handleFileSelect, false);
    
    // 點擊拖放區域也可以觸發檔案選擇
    dropArea.addEventListener('click', () => fileInput.click(), false);
    
    // 下載按鈕
    downloadBtn.addEventListener('click', handleDownload, false);
}

// 輔助函數
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

// 處理拖放檔案
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
        handleFile(files[0]);
    } else {
        alert('請上傳單一 .zip 格式的 WordPress 主題檔案！');
    }
}

// 處理選擇檔案
function handleFileSelect(e) {
    const files = e.target.files;
    
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
        handleFile(files[0]);
    } else {
        alert('請上傳單一 .zip 格式的 WordPress 主題檔案！');
    }
}

// 處理檔案
function handleFile(file) {
    uploadedFile = file;
    fileInfo.textContent = `已選擇: ${file.name} (${formatFileSize(file.size)})`;
    
    // 開始轉換
    startConversion();
}

// 格式化檔案大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 開始轉換過程
function startConversion() {
    // 檢查轉換器
    if (!converter) {
        try {
            console.log('轉換器未初始化，嘗試初始化...');
            initConverter();
            if (!converter) {
                alert('無法初始化繁簡轉換器，請重新整理頁面後再試。');
                resetUI();
                return;
            }
        } catch (error) {
            console.error('初始化轉換器時發生錯誤:', error);
            alert('初始化轉換器時發生錯誤: ' + error.message);
            resetUI();
            return;
        }
    }
    
    // 檢查 JSZip 是否已載入
    if (typeof JSZip === 'undefined') {
        console.error('JSZip 未定義，無法處理ZIP檔案');
        alert('無法處理ZIP檔案：套件載入失敗\n請確認網路連線正常且能夠存取 CDN 資源，然後重新整理頁面。');
        resetUI();
        return;
    }
    
    // 顯示進度區域
    progressContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    
    // 更新進度
    updateProgress(5, '解壓縮中...');
    
    // 讀取並解壓縮檔案
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const zipData = e.target.result;
            if (!zipData) {
                throw new Error('讀取的壓縮檔資料為空');
            }
            
            const zip = await JSZip.loadAsync(zipData);
            if (!zip) {
                throw new Error('解壓縮失敗');
            }
            
            updateProgress(20, '分析檔案中...');
            
            // 處理解壓縮後的檔案
            await processZipFiles(zip);
            
        } catch (error) {
            console.error('處理檔案時發生錯誤:', error);
            alert('處理檔案時發生錯誤: ' + error.message);
            resetUI();
        }
    };
    
    reader.onerror = function(error) {
        console.error('讀取檔案時發生錯誤:', error);
        alert('讀取檔案時發生錯誤。');
        resetUI();
    };
    
    try {
        if (!uploadedFile) {
            throw new Error('沒有選擇檔案');
        }
        reader.readAsArrayBuffer(uploadedFile);
    } catch (error) {
        console.error('讀取檔案時發生錯誤:', error);
        alert('準備檔案讀取時發生錯誤: ' + error.message);
        resetUI();
    }
}

// 處理ZIP檔案中的所有檔案
async function processZipFiles(zip) {
    if (!zip || typeof zip !== 'object') {
        throw new Error('無效的 ZIP 檔案數據');
    }
    
    try {
        // 獲取所有檔案
        const files = Object.keys(zip.files);
        if (files.length === 0) {
            throw new Error('ZIP 檔案中沒有檔案');
        }
        
        const totalFiles = files.length;
        let processedFiles = 0;
        
        // 建立新的zip檔案用於儲存轉換後的結果
        const newZip = new JSZip();
        
        updateProgress(25, `正在轉換檔案... (0/${totalFiles})`);
        
        // 處理每個檔案
        for (const filename of files) {
            try {
                const file = zip.files[filename];
                
                if (!file) {
                    console.warn(`無法獲取檔案: ${filename}，已跳過`);
                    continue;
                }
                
                if (file.dir) {
                    // 如果是目錄，直接加入新的zip
                    newZip.folder(filename);
                } else {
                    // 如果是檔案，檢查是否需要轉換
                    const fileData = await file.async('string');
                    let newData = fileData;
                    
                    // 根據檔案類型決定是否需要轉換
                    if (shouldConvertFile(filename)) {
                        newData = convertContent(fileData);
                    }
                    
                    // 將檔案加入新的zip
                    newZip.file(filename, newData);
                }
                
                processedFiles++;
                const progress = 25 + Math.floor((processedFiles / totalFiles) * 70);
                updateProgress(progress, `正在轉換檔案... (${processedFiles}/${totalFiles})`);
            } catch (fileError) {
                console.error(`處理檔案 ${filename} 時發生錯誤:`, fileError);
                // 繼續處理其他檔案
            }
        }
        
        updateProgress(95, '正在產生新的壓縮檔...');
        
        // 產生新的zip檔案
        const newZipBlob = await newZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });
        
        if (!newZipBlob) {
            throw new Error('產生新的壓縮檔失敗');
        }
        
        // 準備下載
        convertedFile = new File(
            [newZipBlob], 
            uploadedFile.name.replace('.zip', '-正體中文.zip'), 
            { type: 'application/zip' }
        );
        
        updateProgress(100, '轉換完成！');
        
        // 顯示下載區域
        setTimeout(() => {
            progressContainer.style.display = 'none';
            resultContainer.style.display = 'block';
        }, 500);
    } catch (error) {
        console.error('處理 ZIP 檔案時發生錯誤:', error);
        throw error; // 讓上層函數處理錯誤
    }
}

// 判斷檔案是否需要轉換
function shouldConvertFile(filename) {
    // 檢查副檔名
    const ext = filename.split('.').pop().toLowerCase();
    const textExtensions = ['php', 'txt', 'html', 'htm', 'css', 'js', 'json', 'xml', 'md', 'po', 'pot', 'mo'];
    
    return textExtensions.includes(ext);
}

// 轉換內容
function convertContent(content) {
    if (!content) return '';
    
    try {
        // 確保轉換器已初始化
        if (!converter) {
            try {
                initConverter();
                if (!converter) {
                    console.warn('OpenCC 轉換器無法初始化，使用原始內容');
                    return content;
                }
            } catch (error) {
                console.error('轉換內容時發生錯誤:', error);
                alert('處理檔案時發生錯誤: OpenCC is not defined。\n請重新整理頁面後再試。');
                return content;
            }
        }
        
        // 第一步：使用OpenCC進行簡繁中文轉換
        let convertedContent = '';
        try {
            convertedContent = converter(content);
            if (!convertedContent) {
                console.warn('OpenCC 轉換結果為空，使用原始內容');
                convertedContent = content;
            }
        } catch (openccError) {
            console.error('使用 OpenCC 轉換時發生錯誤:', openccError);
            convertedContent = content; // 發生錯誤時使用原始內容
        }
        
        // 第二步：使用自訂字典進行用語轉換（例如「設置」→「設定」）
        try {
            // 檢查全域 customDictionary 物件是否存在
            if (typeof window.customDictionary === 'undefined') {
                console.warn('自訂字典物件未定義，跳過字典轉換');
            } else if (typeof customDictionary.convertWithDictionary === 'function') {
                convertedContent = customDictionary.convertWithDictionary(convertedContent);
            } else {
                console.warn('字典轉換功能不可用，跳過字典轉換');
            }
        } catch (dictError) {
            console.error('使用字典轉換時發生錯誤:', dictError);
            // 保留 OpenCC 的轉換結果
        }
        
        return convertedContent;
    } catch (error) {
        console.error('轉換內容時發生未知錯誤:', error);
        return content; // 發生未知錯誤時返回原始內容
    }
}

// 更新進度條
function updateProgress(percent, statusText) {
    progressBar.style.width = `${percent}%`;
    progressStatus.textContent = statusText;
}

// 處理檔案下載
function handleDownload(e) {
    e.preventDefault();
    
    if (!convertedFile) {
        alert('沒有可下載的檔案。請先轉換一個WordPress主題。');
        return;
    }
    
    // 建立下載連結
    const url = URL.createObjectURL(convertedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 重設UI
function resetUI() {
    // 隱藏進度區域和結果區域
    if (progressContainer) progressContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'none';
    
    // 清空檔案信息
    if (fileInfo) fileInfo.textContent = '尚未選擇檔案';
    
    // 重置進度條
    if (progressBar) progressBar.style.width = '0%';
    if (progressStatus) progressStatus.textContent = '';
    
    // 重置文件變數
    uploadedFile = null;
    convertedFile = null;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    
    // 預先初始化轉換器
    try {
        console.log('預先初始化轉換器...');
        initConverter();
    } catch (error) {
        console.error('預先初始化轉換器時發生錯誤:', error);
    }
}); 