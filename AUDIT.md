## 纳米智能排线助手 - 模块化改造审计报告

截至 2025-12-29

### 1. 完成的核心能力
1. **Dashboard 架构**
   - `/dashboard` 入口 + Sidebar/TopBar 布局。
   - 子模块：Tasks / Map / Analytics / Settings。

2. **任务控制台**
   - 上传、字段映射、调度创建、进度轮询、结果下载。
   - 支持重量默认推导、检测提示。

3. **全局状态 (Zustand)**
   - `useTaskStore` 暴露 `currentTaskId / result / progress / error`。
   - Tasks 写入，Map/Analytics 读取。

4. **调度图谱**
   - 高德地图 JS API。
   - 按车次绘制 Polyline + 站点 Marker + InfoWindow。

5. **效能报告**
   - Recharts 图表：Summary Cards、成本构成饼图、装载率柱图、风险列表。

6. **后台设置**
   - `AdvancedSettings` 存在 Dashboard 中，可恢复默认、跳转后台/任务页面。

### 2. 已知问题 / 风险

| 分类 | 说明 | 影响 | 建议 |
| --- | --- | --- | --- |
| 环境变量 | 地图组件使用 `NEXT_PUBLIC_AMAP_JS_KEY`，尚未在 `.env` 中配置并注释说明 | Map 页面无法加载 | 在 `env.template.txt` 添加该 Key，并在 README 标注 |
| 任务持久化 | `useTaskStore` 只在前端内存存储。刷新页面后 Map/Analytics 数据丢失 | 需要重新跑任务才能查看 | 后续在 `/api/schedule` 完成时将结果写入后端持久化（DB/文件），Map/Analytics 改为请求后端 |
| 权限 | Dashboard 所有页面默认开放。若部署给终端用户，需要鉴权/角色控制 | 可能暴露后台配置 | 后续引入认证（如 NextAuth）或沿用 admin 登录态 |
| API Key 安全 | 高德 JS Key 暴露给前端，建议配合 Referer 限制 | Key 泄露风险 | 在高德控制台限制域名，并在 docs 中注明 |
| npm audit | 目前 `npm audit` 报 5 个漏洞（4 high, 1 critical）。 | 依赖安全风险 | 跟进 `npm audit fix`；若受限于 upstream，可在报告中注明 |
| UI/UX | 任务控制台仍使用旧版页面 `app/dashboard/tasks/page.tsx` 内部包含旧头部。 | 视觉不统一 | 后续将 header/footer 从 Tasks 页面剥离，改用 TopBar/Sidebar 体系 |
| 设备适配 | 地图/图表容器尚未做移动端适配。 | 在窄屏上体验欠佳 | 设置最小高度/响应式 grid |

### 3. 建议的后续迭代
1. **任务结果持久化 + 历史列表**
   - `/api/schedule` 完成后写入数据库；Map/Analytics 可根据任务下拉选择历史结果。
2. **地图交互增强**
   - Hover 高亮车次、筛选车型、导出 GeoJSON。
3. **效能报告扩展**
   - 加入准时率趋势、成本对比（本周 vs 上周）、导出 PDF。
4. **后台设置真正落盘**
   - 将 AdvancedSettings 的修改写入后端配置文件/数据库，任务控制台读取。
5. **权限/登录**
   - 复用 `/admin/login`，为 Dashboard 页面加守卫。
6. **CI & 依赖安全**
   - 处理 npm audit、建立 lint/test CI pipeline。

### 4. 结论
本次改造已完成“模块化框架 + 可视化基础能力”，可以支撑任务→地图→分析的闭环体验。剩余的关键工作集中在“数据持久化、权限、安全”以及“更丰富的交互/图表”，建议按上述优先级继续推进。


