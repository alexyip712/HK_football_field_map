# 香港足球場地圖
# HK_football_field_map

https://alexyip712.github.io/HK_football_field_map/

## 簡介
呢個項目係一個互動網頁 App，畀你搵到香港嘅足球場，包括五人、七人同十一人場，仲有天然草同人造草嘅分別。用 MapLibre GL JS 整咗個互動地圖，支援篩選同搜尋功能，方便你按地區或場地名搵場，仲可以睇到場地設施、開放時間等資訊，點擊同手機觸控都好用！

## 功能
- **互動地圖**：全港足球場一覽無遺，唔同場地類型（五人、七人、十一人，天然/人造草）用唔同顏色標記分得清清楚楚。
- **搜尋同篩選**：輸入場地名、地址或地區，搵場快靚正，仲有自動完成建議同地區篩選。
- **手機友好設計**：桌面同手機都用得，喺手機上仲有可摺疊資訊卡，慳位又實用。
- **定位功能**：一鍵搵到你附近嘅足球場。
- **圖層控制**：用複選框開關唔同場地類型嘅顯示，顏色標記一目了然。
- **離線快取**：用服務工作者快取地圖圖磚，無網絡都睇得到，提升速度。
- **無障礙設施**：場地資訊有無障礙設施詳情，例如觸覺引路帶同暢通易達洗手間。

## 安裝
1. **Clone 倉庫**：
   ```bash
   git clone https://github.com/your-username/hong-kong-football-fields-map.git
   cd hong-kong-football-fields-map
   ```

2. **裝依賴**：
   唔使額外裝乜嘢，項目用 CDN 載入庫（MapLibre GL JS、Font Awesome）。淨係要一個網頁伺服器嚟提供檔案。

3. **跑 App**：
   用本地網頁伺服器（例如 Python 嘅 HTTP 伺服器或 Node.js 嘅 `http-server`）：
   ```bash
   python -m http.server 8000
   ```
   或
   ```bash
   npx http-server
   ```
   喺瀏覽器入 `http://localhost:8000` 就得。

## 用法
- **地圖導航**：放大縮小、拖拉地圖睇晒全港足球場，左上角有導航掣。
- **搜尋**：喺搜尋欄打場地名、地址或地區，邊打邊有建議畀你揀。
- **地區篩選**：喺下拉選單揀地區，只睇嗰區嘅足球場。
- **圖層切換**：用圖層控制嘅複選框開關唔同場地類型嘅顯示。
- **場地詳情**：點擊或輕觸標記，睇場地地址、設施、開放時間同電話等資訊。
- **定位**：點定位掣將地圖中心設為你嘅位置（要瀏覽器授權）。
- **重設篩選**：點「重設」掣，清晒篩選條件同地圖放大率。

## 檔案結構
- `index.html`：主 HTML 檔案，包地圖容器同 UI 元素。
- `all_football_fields.js`：GeoJSON 格式嘅足球場數據，有位置同屬性。
- `maplibre.js`：地圖初始化、篩選同互動嘅 JavaScript 邏輯。
- `custom.css`：地圖、資訊卡同響應式設計嘅 CSS 樣式。
- `sw.js`：用來快取地圖圖磚嘅服務工作者。

## 用咗啲乜嘢技術
- **MapLibre GL JS**：整互動地圖嘅開源庫。
- **OpenStreetMap**：提供基礎地圖圖磚。
- **Font Awesome**：UI 圖示。
- **Noto Sans TC**：支援中文顯示嘅字型。
- **服務工作者**：快取地圖圖磚，支援離線同加速。

## 數據來源
足球場數據喺 `all_football_fields.js` 入面，係 GeoJSON `FeatureCollection` 格式，每個場地有：
- 座標（經度、緯度）
- 屬性：類別、名稱、地址、地區、開放時間、設施、電話、狀態同場地數量。

## 點樣幫手
歡迎一齊搞亂！參與方法：
1. Fork 倉庫。
2. 開新分支（`git checkout -b feature/your-feature`）。
3. 改好再提交（`git commit -m "Add your feature"`）。
4. 推送分支（`git push origin feature/your-feature`）。
5. 開 Pull Request。

請確保代碼同現有風格一致，仲要加啱註釋。

## 報告問題
搵到數據錯漏或 Bug？用 App 底「報料」連結，或者喺 GitHub 開 Issue，講清楚問題。

## 許可證
呢個項目用 MIT 許可證，詳情睇 [LICENSE](LICENSE) 檔案。

## 鳴謝
- MapLibre GL JS：開源地圖庫。
- OpenStreetMap 貢獻者：提供地圖圖磚。
- Noto Sans TC：支援中文渲染嘅字型。

Data from (Last update 18/08/2025): <br>
五人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=2&fcid=8<br>
七人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=3&fcid=8<br>
真草七人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=3&fcid=6<br>
人造草七人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=3&fcid=7<br>
真草11人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=4&fcid=6<br>
人造草11人：https://www.lcsd.gov.hk/clpss/tc/webApp/Facility/Details.do?ftid=4&fcid=7<br>
