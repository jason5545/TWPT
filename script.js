/**
 * 簡轉繁 WP 主題轉換器
 * 將簡體中文WordPress主題轉換為台灣用語的正體中文
 * @version 1.1.0
 */

// DOM元素
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressStatus = document.getElementById('progressStatus');
const resultContainer = document.getElementById('resultContainer');
const resultInfo = document.getElementById('resultInfo');
const downloadBtn = document.getElementById('downloadBtn');

// 檔案及轉換相關變數
let uploadedFile = null;
let convertedFile = null;
let converter = null;
let processingCancelled = false;
let conversionStats = {
    totalFiles: 0,
    processedFiles: 0,
    convertedFiles: 0,
    totalSize: 0,
    convertedSize: 0,
    startTime: 0,
    endTime: 0,
    errors: []
};

// 應用程式初始化
function initApp() {
    console.log('應用程式初始化中...');
    
    // 初始化事件監聽器
    initEventListeners();
    
    // 初始化OpenCC轉換器
    initConverter();
    
    // 初始化頁面
    resetUI();
    
    console.log('應用程式初始化完成');
}

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
            console.log('使用新版 OpenCC API 初始化成功');
        } catch (e) {
            console.warn('新版 API 初始化失敗，嘗試替代方法:', e);
            
            // 嘗試替代的 API 形式
            if (typeof OpenCC.s2twp === 'function') {
                converter = function(text) { return OpenCC.s2twp(text); };
                console.log('使用 OpenCC.s2twp 函數初始化成功');
            } else if (typeof OpenCC.s2t === 'function') {
                converter = function(text) { return OpenCC.s2t(text); };
                console.log('使用 OpenCC.s2t 函數初始化成功');
            } else {
                throw new Error('找不到適合的轉換函數');
            }
        }
    } catch (error) {
        console.error('初始化 OpenCC 轉換器時發生錯誤:', error);
        alert('無法初始化繁簡轉換器: ' + error.message + '\n請確認網路連線正常且能夠存取 CDN 資源。');
        resetUI();
        return false;
    }
    
    return true;
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
    
    // 防止在轉換過程中重新載入頁面
    window.addEventListener('beforeunload', function(e) {
        if (isProcessing()) {
            const confirmationMessage = '檔案正在轉換中，離開頁面將會中斷轉換過程。確定要離開嗎？';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
    
    // 為視窗添加鍵盤快捷鍵
    window.addEventListener('keydown', function(e) {
        // ESC 鍵取消處理
        if (e.key === 'Escape' && isProcessing()) {
            processingCancelled = true;
            updateProgress(100, '已取消處理');
        }
    });
}

// 檢查是否處於處理中狀態
function isProcessing() {
    return progressContainer.style.display !== 'none' && 
           resultContainer.style.display === 'none' &&
           !processingCancelled;
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
    // 重設取消標誌
    processingCancelled = false;
    
    // 重設統計資訊
    conversionStats = {
        totalFiles: 0,
        processedFiles: 0,
        convertedFiles: 0,
        totalSize: 0,
        convertedSize: 0,
        startTime: Date.now(),
        endTime: 0,
        errors: []
    };
    
    // 檢查轉換器
    if (!converter) {
        try {
            console.log('轉換器未初始化，嘗試初始化...');
            if (!initConverter()) {
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
    
    // 檢查字典是否可用
    if (typeof customDictionary === 'undefined' || !customDictionary.convertWithDictionary) {
        console.warn('字典模組未載入或不可用，將不使用自訂字典轉換');
    } else {
        // 顯示字典統計信息
        const stats = customDictionary.getStats();
        console.log('字典統計:', stats);
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
        
        conversionStats.totalFiles = files.length;
        
        // 建立新的zip檔案用於儲存轉換後的結果
        const newZip = new JSZip();
        
        updateProgress(25, `正在轉換檔案... (0/${conversionStats.totalFiles})`);
        
        // 處理每個檔案
        for (const filename of files) {
            // 檢查是否取消處理
            if (processingCancelled) {
                console.log('使用者已取消處理');
                break;
            }
            
            try {
                const file = zip.files[filename];
                
                if (!file) {
                    console.warn(`無法獲取檔案: ${filename}，已跳過`);
                    continue;
                }
                
                // 更新處理進度
                conversionStats.processedFiles++;
                const progressPercent = 25 + Math.floor((conversionStats.processedFiles / conversionStats.totalFiles) * 70);
                updateProgress(
                    progressPercent,
                    `正在轉換檔案... (${conversionStats.processedFiles}/${conversionStats.totalFiles})`
                );
                
                if (file.dir) {
                    // 如果是目錄，直接加入新的zip
                    newZip.folder(filename);
                } else {
                    // 檔案大小統計
                    const fileSize = file._data ? file._data.uncompressedSize || 0 : 0;
                    conversionStats.totalSize += fileSize;
                    
                    // 如果是檔案，檢查是否需要轉換
                    let fileData;
                    let newData;
                    
                    // 二進位檔案直接複製
                    if (!shouldConvertFile(filename)) {
                        fileData = await file.async('arraybuffer');
                        newZip.file(filename, fileData);
                    } else {
                        // 文字檔案需要轉換
                        try {
                            fileData = await file.async('string');
                            newData = convertContent(fileData);
                            
                            // 如果轉換後的內容與原內容不同，計數增加
                            if (newData !== fileData) {
                                conversionStats.convertedFiles++;
                                conversionStats.convertedSize += fileSize;
                            }
                            
                            newZip.file(filename, newData);
                        } catch (error) {
                            // 如果文字轉換錯誤，嘗試以二進位檔案處理
                            console.warn(`轉換檔案 ${filename} 時發生錯誤，以二進位形式處理: ${error.message}`);
                            fileData = await file.async('arraybuffer');
                            newZip.file(filename, fileData);
                            
                            // 記錄錯誤
                            conversionStats.errors.push({
                                filename,
                                error: error.message
                            });
                        }
                    }
                }
            } catch (fileError) {
                console.error(`處理檔案 ${filename} 時發生錯誤:`, fileError);
                
                // 記錄錯誤
                conversionStats.errors.push({
                    filename,
                    error: fileError.message
                });
            }
        }
        
        // 完成處理
        if (processingCancelled) {
            resetUI();
            return;
        }
        
        updateProgress(95, '正在產生轉換後的ZIP檔案...');
        
        // 生成新的壓縮檔
        const originalName = uploadedFile.name;
        const baseName = originalName.replace(/\.zip$/i, '');
        const newFilename = `${baseName}_tw.zip`;
        
        // 產生轉換後的ZIP檔案
        convertedFile = await newZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });
        
        // 更新下載按鈕
        downloadBtn.download = newFilename;
        downloadBtn.href = URL.createObjectURL(convertedFile);
        
        // 記錄結束時間
        conversionStats.endTime = Date.now();
        
        // 計算及顯示結果資訊
        displayConversionResults();
        
        // 顯示結果區域
        updateProgress(100, '轉換完成！');
        progressContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        
    } catch (error) {
        console.error('處理ZIP檔案時發生錯誤:', error);
        conversionStats.endTime = Date.now();
        alert('處理ZIP檔案時發生錯誤: ' + error.message);
        resetUI();
    }
}

// 顯示轉換結果統計資訊
function displayConversionResults() {
    const timeTaken = (conversionStats.endTime - conversionStats.startTime) / 1000; // 秒
    const convertedSizeFormatted = formatFileSize(conversionStats.convertedSize);
    const totalSizeFormatted = formatFileSize(conversionStats.totalSize);
    
    // 準備基本結果資訊
    let resultText = `
        <div>處理結果摘要：</div>
        <ul>
            <li>轉換檔案數：${conversionStats.convertedFiles} / ${conversionStats.totalFiles}</li>
            <li>轉換資料量：${convertedSizeFormatted} / ${totalSizeFormatted}</li>
            <li>處理時間：${timeTaken.toFixed(2)} 秒</li>
        </ul>
    `;
    
    // 添加自訂字典使用情況
    if (typeof customDictionary !== 'undefined' && customDictionary.getStats) {
        const dictStats = customDictionary.getStats();
        resultText += `<div>使用字典項目數：${dictStats.entryCount}</div>`;
    }
    
    // 添加錯誤資訊（如果有）
    if (conversionStats.errors.length > 0) {
        resultText += `
            <details>
                <summary>處理過程中有 ${conversionStats.errors.length} 個錯誤</summary>
                <div style="margin-top: 8px; font-size: 0.85em;">
        `;
        
        // 最多顯示前10個錯誤
        const displayErrors = conversionStats.errors.slice(0, 10);
        displayErrors.forEach(err => {
            resultText += `<div>• ${err.filename}: ${err.error}</div>`;
        });
        
        if (conversionStats.errors.length > 10) {
            resultText += `<div>...(還有 ${conversionStats.errors.length - 10} 個錯誤未顯示)</div>`;
        }
        
        resultText += `</div></details>`;
    }
    
    resultInfo.innerHTML = resultText;
}

// 判斷檔案是否需要轉換
function shouldConvertFile(filename) {
    // 只有特定檔案類型需要轉換
    const textExtensions = ['.php', '.html', '.htm', '.css', '.js', '.txt', '.md', '.json', '.xml', '.po', '.pot'];
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return textExtensions.includes(ext);
}

// 轉換內容
function convertContent(content) {
    if (!content || typeof content !== 'string') {
        return content;
    }
    
    try {
        // 使用 OpenCC 進行簡繁轉換
        let convertedText = content;
        
        // 檢查 converter 是否可用
        if (converter && typeof converter === 'function') {
            convertedText = converter(content);
        } else if (converter && typeof converter.convert === 'function') {
            convertedText = converter.convert(content);
        } else {
            console.warn('轉換器無法使用，將不進行簡繁轉換');
        }
        
        // 使用自訂字典進行台灣用語轉換
        if (typeof customDictionary !== 'undefined' && customDictionary.convertWithDictionary) {
            convertedText = customDictionary.convertWithDictionary(convertedText);
        }
        
        return convertedText;
    } catch (error) {
        console.error('轉換內容時發生錯誤:', error);
        // 發生錯誤時返回原始內容
        return content;
    }
}

// 更新進度條
function updateProgress(percent, statusText) {
    progressBar.style.width = `${percent}%`;
    progressStatus.textContent = statusText;
}

// 處理下載
function handleDownload(e) {
    if (!convertedFile) {
        e.preventDefault();
        alert('無法下載檔案，請先完成轉換');
    }
}

// 重設UI
function resetUI() {
    convertedFile = null;
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    progressBar.style.width = '0%';
    progressStatus.textContent = '準備中...';
    
    // 釋放舊的 URL 對象
    if (downloadBtn.href && downloadBtn.href.startsWith('blob:')) {
        URL.revokeObjectURL(downloadBtn.href);
    }
    downloadBtn.href = '#';
    
    // 檢查是否有上傳的檔案
    if (uploadedFile) {
        fileInfo.textContent = `已選擇: ${uploadedFile.name} (${formatFileSize(uploadedFile.size)})`;
    } else {
        fileInfo.textContent = '尚未選擇檔案';
    }
}

// 初始化應用程式
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
} 