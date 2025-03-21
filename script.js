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
    // 使用s2twp轉換器（簡體轉台灣正體，並轉換用語）
    converter = OpenCC.Converter({ from: 's', to: 'twp' });
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
            const zip = await JSZip.loadAsync(zipData);
            
            updateProgress(20, '分析檔案中...');
            
            // 處理解壓縮後的檔案
            await processZipFiles(zip);
            
        } catch (error) {
            console.error('處理檔案時發生錯誤:', error);
            alert('處理檔案時發生錯誤: ' + error.message);
            resetUI();
        }
    };
    
    reader.onerror = function() {
        alert('讀取檔案時發生錯誤。');
        resetUI();
    };
    
    reader.readAsArrayBuffer(uploadedFile);
}

// 處理ZIP檔案中的所有檔案
async function processZipFiles(zip) {
    // 獲取所有檔案
    const files = Object.keys(zip.files);
    const totalFiles = files.length;
    let processedFiles = 0;
    
    // 建立新的zip檔案用於儲存轉換後的結果
    const newZip = new JSZip();
    
    updateProgress(25, `正在轉換檔案... (0/${totalFiles})`);
    
    // 處理每個檔案
    for (const filename of files) {
        const file = zip.files[filename];
        
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
    
    // 準備下載
    convertedFile = new File(
        [newZipBlob], 
        uploadedFile.name.replace('.zip', '-繁體中文.zip'), 
        { type: 'application/zip' }
    );
    
    updateProgress(100, '轉換完成！');
    
    // 顯示下載區域
    setTimeout(() => {
        progressContainer.style.display = 'none';
        resultContainer.style.display = 'block';
    }, 500);
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
    if (!converter) {
        initConverter();
    }
    
    // 第一步：使用OpenCC進行簡繁中文轉換
    let convertedContent = converter(content);
    
    // 第二步：使用自訂字典進行用語轉換（例如「設置」→「設定」）
    convertedContent = customDictionary.convertWithDictionary(convertedContent);
    
    return convertedContent;
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
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    fileInfo.textContent = '尚未選擇檔案';
    progressBar.style.width = '0%';
    progressStatus.textContent = '準備中...';
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
}); 