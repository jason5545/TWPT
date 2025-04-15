# 正體中文 WordPress 主題轉換器 (TWPT)

TWPT (Traditional WordPress Theme Translator) - 台灣用語正體中文WordPress主題轉換工具

這個專案提供一個簡單的工具，能夠自動將簡體中文WordPress主題轉換成台灣用語的正體中文版本。

## 功能

- 上傳簡體中文WordPress主題壓縮檔
- 自動轉換所有文字為台灣正體中文用語
- 提供自訂字典功能，增強用語轉換精度
- 提供轉換後的主題下載

## 使用方式

1. 前往此專案的GitHub Pages網站：[https://jason5545.github.io/TWPT/](https://jason5545.github.io/TWPT/)
2. 上傳您的WordPress主題壓縮檔
3. 等待轉換完成
4. 下載轉換後的正體中文主題

## 自訂字典功能

為了提高用語轉換精度，您可以使用自訂字典功能：

1. 點擊「管理字典」按鈕開啟字典編輯器
2. 新增要特別轉換的用語組合（原始詞彙 → 台灣用語）
   - 例如：「設置」→「設定」、「信息」→「資訊」
   - 字典專注於處理不同正體中文用語間的差異
3. 您的字典會自動儲存在瀏覽器中，下次使用時仍然有效

您也可以：
- 匯出字典：將您的自訂字典儲存為JSON檔案
- 匯入字典：從先前儲存的JSON檔案載入字典

我們已提供一個[預設字典範例](default_dictionary.json)，包含常見的詞彙用語轉換。

## 技術說明

本工具使用以下技術：

- HTML5、CSS3 和 JavaScript (ES6+)
- [JSZip](https://stuk.github.io/jszip/) - 處理ZIP檔案
- [OpenCC-js](https://github.com/nk2028/opencc-js) - 簡繁中文轉換
- GitHub Pages - 網站託管

轉換流程：
1. 先使用 OpenCC 的 `s2twp` 轉換模式處理簡體轉繁體
   - 將簡體字轉為繁體字
   - 部分中國大陸用語轉換為台灣用語
2. 再套用自訂字典進行詳細的用語轉換
   - 針對已經是繁體但慣用語不同的情況
   - 補充處理 OpenCC 未能轉換的特殊術語

## 在本地運行

如果您想在本地運行這個專案：

1. 克隆此儲存庫
   ```
   git clone https://github.com/jason5545/TWPT.git
   cd TWPT
   ```

2. 使用任何HTTP伺服器運行，例如：
   ```
   npx http-server
   ```
   或使用 Python 的簡易伺服器：
   ```
   python -m http.server
   ```

3. 在瀏覽器中打開 `http://localhost:8080` 或您的伺服器URL

## 部署到您自己的 GitHub Pages

1. Fork 此儲存庫
2. 前往您的儲存庫設定 > Pages
3. 在「Source」部分選擇「main」分支
4. 儲存設定，您的網站將在幾分鐘內部署

## 貢獻

歡迎提交 Pull Request 或開 Issue 來改進此專案。特別歡迎對自訂字典的貢獻。

## 授權

本專案使用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。 
