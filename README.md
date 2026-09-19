# 雲倉預約系統範本

一套開源、可以自己部署的 LINE 預約系統。單一 Cloudflare Worker 搭配 Cloudflare D1 資料庫，包含客人端 LIFF 線上預約、多服務人員排程、完整後台管理、防濫用機制與 LINE 通知稽核，沒有額外的後端伺服器或第三方服務。

## 功能亮點

- **LINE 整合預約**：LIFF 網頁預約表單 + LINE 官方帳號自動回覆，客人不用下載 App、不用註冊帳號
- **雙排程模式**：手動建立時段，或依服務人員每週班表自動計算可預約時間，兩種模式可以並行
- **完整後台管理**：預約管理（含日期區間篩選）、行事曆、顧客標記與 CSV 匯出入、服務項目、公休日、月度報表、多帳號權限（管理員／員工）
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

點下按鈕後，會請你用 GitHub 帳號登入、把這個 repo fork 一份到你自己的帳號下，再連結你的 Cloudflare 帳號，接著自動建立資源並部署。

> **注意**：一鍵部署只會幫你把程式碼跑起來，**不會自動套用資料庫結構（migrations）**。部署完成、還沒開啟 `/setup` 之前，請先到 Cloudflare Dashboard 找到剛建立的 D1 資料庫，或用以下指令手動套用一次：
>
> ```bash
> npx wrangler login
> npx wrangler d1 execute <你的 D1 資料庫名稱> --remote --file=migrations/0001_init.sql
> # 依序把 migrations/ 資料夾裡的 .sql 檔案都執行一次
> ```
>
> 如果一鍵部署過程沒有自動建立 D1 資料庫，或是 `wrangler.toml` 裡的 `database_id` 沒有被自動填上，請改用下面「方法二」自己建立 D1 並手動填上 `database_id` 後再部署一次。

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

#### 2. 套用資料庫結構

```bash
for f in migrations/*.sql; do
  npx wrangler d1 execute cloudcang-booking-template --remote --file="$f"
done
```

#### 3. 部署

```bash
npx wrangler deploy
```

完成後會拿到一個 `*.workers.dev` 網址。

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
