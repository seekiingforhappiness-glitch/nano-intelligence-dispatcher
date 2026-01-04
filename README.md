# 🚚 纳米智能排线助手

车辆智能调度系统 - 用于"一个仓提货 → 多点送货"的日常排线排车。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特点

- 📁 **Excel 文件上传**：支持 .xlsx、.xls、.csv 格式
- 🧹 **智能数据清洗**：自动识别字段、修正格式、处理异常
- 🗺️ **地址解析**：集成高德地图 API，自动获取经纬度
- 🚛 **智能排线**：极坐标分组 + 贪心装箱 + 最近邻路由
- ⏰ **时效约束**：硬性保证不晚到
- 💰 **成本优化**：多种成本计算模式
- 📊 **可视化结果**：实时进度 + 汇总看板 + Excel 下载

## 🛠️ 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **地图服务**: 高德开放平台
- **数据库** (可选): Supabase (PostgreSQL)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/your-username/nano-logistics-scheduler.git
cd nano-logistics-scheduler

# 2. 安装依赖（使用国内镜像）
npm install --registry=https://registry.npmmirror.com

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的高德 API Key

# 4. 启动开发服务器
npm run dev

# 5. 打开浏览器访问 http://localhost:3000
```

### 环境变量说明

创建 `.env.local` 文件：

```env
# 高德地图 API Key（必填）
# 服务端 API 调用（Web 服务 Key）
AMAP_KEY=你的高德Web服务Key

# 前端 JS API 调用（Web 端 Key）
# 注意：如果安全配置允许，可以和 AMAP_KEY 相同，建议分开申请以限制域名
NEXT_PUBLIC_AMAP_JS_KEY=你的高德Web端Key

# Supabase 配置（可选，用于地址缓存）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx

# 发货仓配置
DEPOT_NAME=江苏金发科技生产基地
DEPOT_ADDRESS=江苏省苏州市昆山市千灯镇石浦恒升路101号
DEPOT_LNG=121.2367
DEPOT_LAT=31.2156
```

### 获取高德 API Key

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册/登录账号
3. 进入「控制台」→「应用管理」→「创建新应用」
4. 添加 Key，服务平台选择「Web服务」
5. 复制生成的 Key 到 `.env.local`

## 📦 部署

### 方案一：Vercel 部署（推荐）

1. Fork 本项目到你的 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "New Project" → 导入你的仓库
4. 在 "Environment Variables" 中添加环境变量
5. 点击 "Deploy"

### 方案二：Docker 部署

```bash
# 构建镜像
docker build -t nano-scheduler .

# 运行容器
docker run -d -p 3000:3000 \
  -e AMAP_KEY=你的Key \
  -e DEPOT_NAME=江苏金发科技生产基地 \
  nano-scheduler

# 或使用 docker-compose
docker-compose up -d
```

### 方案三：云服务器部署

```bash
# 1. 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 克隆并构建
git clone https://github.com/your-username/nano-logistics-scheduler.git
cd nano-logistics-scheduler
npm install --registry=https://registry.npmmirror.com
npm run build

# 3. 使用 PM2 运行
npm install -g pm2
pm2 start npm --name "nano-scheduler" -- start

# 4. 配置 Nginx 反向代理（可选）
```

## 📖 使用说明

### 1. 上传文件

支持的文件格式：
- Excel 2007+（.xlsx）
- Excel 97-2003（.xls）
- CSV 文件（.csv）

### 2. 字段映射

系统会自动识别以下字段（支持模糊匹配）：

| 系统字段 | 可识别名称 |
|---------|-----------|
| 送货单号 | 订单号、单号、发货单号、SO号 |
| 发货日期 | 发货时间、出库日期、装车日期 |
| 到货日期 | 送达日期、要求到达、交货日期 |
| 送达方 | 客户名称、收货方、收货客户 |
| 重量 | 货重、毛重、净重 |
| 地址 | 收货地址、送货地址、目的地 |
| 规格 | 包装规格、件规 |
| 运输要求 | 发货要求、备注、特殊要求 |

### 3. 运输要求解析

系统会自动从「运输要求」字段提取以下约束：

| 约束类型 | 关键词示例 |
|---------|-----------|
| 车型要求 | 飞翼车、厢式、平板 |
| 时间窗 | 080000-170000、下午、上午 |
| 周末限制 | 周日不收货、周六不收货 |
| 堆叠限制 | 不加高、大包不能加高 |
| 路由约束 | 不允许带货进厂、排最后 |

### 4. 车型配置

默认车型：

| 车型 | 载重 | 托盘位 | 起步价 | 里程价 |
|-----|------|-------|-------|-------|
| 3.8米 | 3吨 | 6 | ¥300 | ¥1.5/km |
| 4.2米 | 4吨 | 8 | ¥350 | ¥1.8/km |
| 6.8米 | 10吨 | 14 | ¥500 | ¥2.5/km |
| 9.6米 | 18吨 | 20 | ¥800 | ¥3.5/km |
| 12.5米 | 28吨 | 28 | ¥1200 | ¥4.5/km |
| 13.5米 | 32吨 | 32 | ¥1500 | ¥5.0/km |
| 17.5米 | 40吨 | 40 | ¥2000 | ¥6.0/km |

## 🔧 配置说明

### 调度参数

| 参数 | 默认值 | 说明 |
|-----|-------|------|
| maxStops | 8 | 每个车次最大串点数 |
| startTime | 06:00 | 发车开始时间 |
| deadline | 20:00 | 最晚送达截止 |
| costMode | mileage | 成本计算模式 |

### 成本计算模式

- **mileage**: 起步价 + 里程单价 × 距离
- **fixed**: 固定价格（每趟）
- **hybrid**: 取两者较大值

## 📁 项目结构

```
nano-logistics-scheduler/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── upload/        # 文件上传
│   │   ├── schedule/      # 调度任务
│   │   └── download/      # 结果下载
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 主页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
├── lib/                   # 核心库
│   ├── parser/           # 解析器
│   ├── scheduler/        # 调度算法
│   ├── amap/             # 高德 API
│   └── utils/            # 工具函数
├── types/                 # TypeScript 类型
├── config/                # 配置文件
├── Dockerfile            # Docker 配置
└── docker-compose.yml    # Docker Compose
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License


