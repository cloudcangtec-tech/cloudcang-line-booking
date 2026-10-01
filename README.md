# 雲倉預約系統範本

一套開源、可以自己部署的 LINE 預約系統。單一 Cloudflare Worker 搭配 Cloudflare D1 資料庫，包含客人端 LIFF 線上預約、多服務人員排程、完整後台管理、防濫用機制與 LINE 通知稽核，沒有額外的後端伺服器或第三方服務。

## 功能亮點

- **LINE 整合預約**：LIFF 網頁預約表單 + LINE 官方帳號自動回覆，客人不用下載 App、不用註冊帳號
- **五步驟預約精靈**：加購項目 → 服務人員 → 日期 → 時段 → 填寫資料，手機上以底部彈窗（bottom sheet）呈現
- **雙排程模式**：手動建立時段，或依服務人員每週班表自動計算可預約時間，兩種模式可以並行
- **店面形象頁**：Logo、橫幅輪播圖、作品集圖庫、跑馬燈公告、營業時間／電話／社群連結，都能在後台自行上傳與編輯，預約頁會自動用這些資料組成一頁式店面介紹
- **服務項目與加購**：服務項目可以填價格與說明；另外有獨立的「加購項目」管理（例如延長時間、加購商品），客人下單時可複選，訂單會記錄加購當下的名稱與價格快照，之後調整加購項目不會影響到舊訂單
- **服務人員檔案**：每位服務人員可以上傳大頭貼、填寫簡介，顯示在預約精靈的「選擇服務人員」步驟
- **客人自助改期／取消**：預約成立後 LINE 會推送一個管理連結，客人可以自己取消，或用跟預約精靈同樣的卡片式日期／時段選擇器改期，不用再透過店家手動處理
- **LINE 關鍵字自動回覆**：客人輸入「查詢」或「查詢預約」會列出目前有效的預約（含改期／取消連結，以圖文卡片呈現）；輸入「聯絡我們」會回覆營業時間、電話、社群連結；句子裡包含「預約」則回覆線上預約連結
- **圖文選單設定指南**：後台有一頁說明如何在 LINE 官方帳號管理後台（manager.line.biz）自行設計圖文選單、建議的按鈕與動作設定——這是純說明頁，不會自動呼叫 LINE API 幫你套用任何東西到你的正式帳號
- **訊息範本一鍵插入變數**：後台編輯 LINE 自動通知文字時，不用自己記憶或輸入 `{{customer_name}}` 這種語法，點擊按鈕就能把對應資料插入游標位置
- **完整後台管理**：預約管理（含統計列、日期區間篩選、服務人員／加購獨立欄位）、行事曆（含「⚠ 曾取消」標記，提醒哪些時段曾經被取消過）、顧客標記與 CSV 匯出入、公休日、月度報表、多帳號權限（管理員／員工）
- **帳號安全機制**：PBKDF2 密碼雜湊、登入失敗鎖定、Cloudflare Turnstile 機器人驗證、可自訂後台登入路徑、異地登入 LINE 警示
- **預約防濫用**：電話格式檢查、黑名單、重複預約提示、可調整的最晚預約／取消／改期時數限制
- **LINE 通知稽核**：所有推播/回覆訊息都留有紀錄，成功失敗一目了然
- **開箱即用**：內建 `/setup` 初始化精靈，部署完成後不用碰資料庫指令就能建立第一個管理員帳號與服務項目

## 技術架構

| 元件 | 說明 |
|---|---|
| Cloudflare Workers | 處理所有路由：靜態網站、公開 API、LINE Webhook、後台管理、Cron 排程提醒 |
| Cloudflare D1 | SQLite 相容資料庫，schema 由 `migrations/` 依序建立與演進 |
| LINE Messaging API + LIFF | 經典 LIFF（掛在 LINE Login channel 下），不需要 LINE Mini App 審核即可上線 |

## 專案結構

```
src/
  index.js       -- 所有路由與業務邏輯
  templates.js   -- 頁面 HTML 樣板
  auth.js        -- 密碼雜湊、session
  line.js        -- LINE Messaging API 呼叫
  messages.js    -- LINE 訊息範本組裝
  settings.js    -- 設定值讀寫（D1 優先，敏感金鑰有 Cloudflare Secret 備援）
migrations/      -- D1 資料庫 schema，依編號依序執行
public/          -- 靜態網站（這份說明頁本身）
scripts/
  create-admin.js -- 忘記密碼或想重設管理員帳號時的救援工具
```

## 快速開始

需要一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費方案即可）。有兩種部署方式：

- **方法一：一鍵部署**——不用裝任何東西、不用碰終端機，直接用瀏覽器完成
- **方法二：命令列部署**——用 `wrangler` CLI，步驟比較多但每一步都在自己掌控中

兩種方法完成部署後，都一樣要接著執行「開啟 `/setup` 完成初始化」那一步。

### 方法一：一鍵部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudcangtec-tech/cloudcang-line-booking)

點下按鈕後，會請你用 GitHub 帳號登入、把這個 repo 複製一份到你自己的帳號下（這是獨立的新 repo，之後這個範本有更新不會自動同步過去），再連結你的 Cloudflare 帳號、選擇或建立 D1 資料庫，接著自動建置並部署。

> **注意：第一次建置幾乎一定會失敗，這是正常現象，不代表你哪裡做錯了。**
>
> 原因：設定畫面裡的「Select D1 資料庫」只會幫你**建立**一個 D1 資料庫，但不會把它的 `database_id` 寫回 repo 裡的 `wrangler.toml`——檔案裡還是原本的佔位字串 `REPLACE_WITH_YOUR_OWN_D1_DATABASE_ID`，所以第一次建置一定會在 `wrangler d1 migrations apply` 或 `wrangler deploy` 這一步失敗（錯誤訊息通常是 `Couldn't find a D1 DB` 或 `must have a valid database_id`）。
>
> **修復步驟（做完後重新觸發一次建置就會成功）：**
>
> 1. 到 Cloudflare Dashboard → **Workers & Pages → D1**，找到剛剛建立的那個資料庫（名稱通常跟你的專案名稱一樣），點進去複製完整的 **UUID**
> 2. 到你複製出來的那個新 repo（例如 `你的帳號/你的專案名稱`），編輯 `wrangler.toml`，把：
>    ```toml
>    [[d1_databases]]
>    binding = "DB"
>    database_name = "cloudcang-booking-template"
>    database_id = "REPLACE_WITH_YOUR_OWN_D1_DATABASE_ID"
>    ```
>    改成你自己的資料庫名稱與剛才複製的 UUID，例如：
>    ```toml
>    [[d1_databases]]
>    binding = "DB"
>    database_name = "你的專案名稱"
>    database_id = "剛才複製的UUID"
>    ```
>    直接在 GitHub 網頁上編輯這個檔案、commit 即可，不需要在自己電腦上操作
> 3. commit 之後 Cloudflare Workers Builds 會自動偵測到新的 push 並重新建置，這次就會成功
>
> 建置紀錄裡如果出現「Failed to match Worker name...」的黃色警告，不會導致部署失敗，可以忽略。
>
> 如果想完全避開這個手動修復步驟，改用下面「方法二：命令列部署」，資料庫建立跟填 `database_id` 是同一時間在自己電腦上完成，不會遇到這個問題。

### 方法二：命令列部署

需要 Node.js。

```bash
git clone https://github.com/cloudcangtec-tech/cloudcang-line-booking.git
cd cloudcang-line-booking
npm install
npx wrangler login
```

#### 1. 建立你自己的 D1 資料庫

```bash
npx wrangler d1 create cloudcang-booking-template
```

把印出來的 `database_id` 貼到 [wrangler.toml](wrangler.toml) 的 `database_id` 欄位，取代 `REPLACE_WITH_YOUR_OWN_D1_DATABASE_ID`。

#### 2. 套用資料庫結構並部署

```bash
npm run deploy
```

這個指令會先套用 `migrations/` 裡的資料庫結構，再部署程式碼，完成後會拿到一個 `*.workers.dev` 網址。（只想單獨套用資料庫結構，不部署程式碼的話，可以用 `npm run migrate`。）

### 開啟 `/setup` 完成初始化

打開 `https://你的網址/setup`，照畫面填寫：

1. 站名
2. 管理員帳號密碼
3. LINE 串接金鑰（選填，之後也可以在後台補上）
4. 第一個服務項目
5. 第一位服務人員（選填）

完成後這個頁面會自動關閉、無法重複執行。之後從 `/admin` 用剛設定的帳密登入後台即可。

## （選用）串接 LINE 官方帳號

1. 到 [LINE Developers](https://developers.line.biz/) 建立一個 Messaging API channel
2. 在同一組 **LINE Login channel** 下建立一個經典 LIFF（不是 LINE Mini App，不需要審核）
3. 把 Channel Secret／Channel Access Token／LIFF ID 填進後台「第三方串接」頁面
4. Webhook URL 設為 `https://你的網域/api/line/webhook`

沒有串接 LINE 也能純用後台手動建立與管理預約。

## 更新版本

這個範本之後會持續修正問題、新增功能。你的站名、LINE 金鑰、服務項目、員工班表等個人化設定都存在你自己的 D1 資料庫裡，不是寫在程式碼檔案中，所以更新程式碼通常不會影響到你已經設定好的資料，衝突風險很低。

### 第一次更新前，先把原始 repo 設為 upstream（只需要做一次）

```bash
git remote add upstream https://github.com/cloudcangtec-tech/cloudcang-line-booking.git
```

### 之後每次要更新，重複這個流程即可

```bash
git fetch upstream
git merge upstream/main
npm run deploy
```

`npm run deploy` 會先套用新的資料庫結構變更（如果這次更新有新增 migration），再部署最新程式碼。

> 例如本次新增的店面形象頁、服務項目價格／說明、服務人員大頭貼與簡介、加購項目等功能，對應的資料庫結構變更就在 `migrations/0024_shop_profile.sql`、`0025_shop_logo.sql`、`0026_service_pricing_and_stylist_profile.sql`、`0027_addons.sql` 這幾個檔案裡，`npm run deploy`（或 `npm run migrate`）會依編號自動依序套用，不需要手動執行。

### 如果你是用「一鍵部署」接 GitHub 的

Cloudflare Workers Builds 會自動追蹤你 fork 的 repo，`git merge` 完後只要 `git push`，Cloudflare 就會自動重新部署，不用再手動跑 `npm run deploy`。

### 如果 `git merge` 出現衝突

通常代表你自己手動改過原始碼檔案（例如自己調整過 CSS 或版面），這種情況下 Git 會在衝突的檔案裡標出 `<<<<<<<` `=======` `>>>>>>>` 的區塊，手動決定要保留哪一段、刪掉標記後存檔，再 `git add` 、`git commit` 完成合併即可。如果不確定怎麼處理，建議備份整個資料夾後再操作，或先在本機測試環境（`npm run dev`）確認沒問題再部署到正式環境。

## 安全建議

- 如果對外公開使用，建議設定 Cloudflare Turnstile 機器人驗證（後台「第三方串接」頁面），同時保護後台登入與客人預約頁
- 建議把後台登入路徑從預設的 `/admin` 換掉（同一個頁面可以設定）
- 忘記管理員密碼、或想在不經過網頁的情況下重設帳號，可以用：

  ```bash
  node scripts/create-admin.js 你的帳號 你的密碼
  ```

  產生對應的 SQL，貼給 `wrangler d1 execute --remote` 執行即可（雜湊方式跟 `src/auth.js` 完全一致）。

## 已知限制

- 已經有時段紀錄的服務項目無法單純刪除（資料庫外鍵限制），只能停用或使用「強制刪除」（會連同相關預約一併永久刪除）
- LINE 官方帳號的 Push / Multicast / Broadcast 訊息共用同一組每月免費則數，額度用盡時發送會失敗（後台「LINE 通知紀錄」可以看到）
- 「顧客」列表是從預約紀錄即時彙整出來的，不是獨立的顧客主檔；CSV 匯入只能覆蓋標記與備註

## License

MIT License（詳見 [LICENSE](LICENSE)）
