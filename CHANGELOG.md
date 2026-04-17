# 更新记录

本项目当前采用手动维护的变更记录，按时间倒序整理关键版本节点。

## 当前版本

- 当前发布标签: `v1.0.2`
- 当前稳定回滚标签: `v1.0.0-stable-20260417`

## 2026-04-17

### `v1.0.2`

- 新增对局自动存档与恢复横幅，刷新后可继续上局或放弃
- 新增最近 20 局本地记录、总局数、玩家胜率和最近一局摘要
- 新增规则边界样例页，覆盖五连、长连、三三、四四、悔棋恢复和 AI 先手恢复
- 新增人机模式先手方配置，支持玩家先手和 AI 先手
- 优化移动端与缩放场景下的棋盘输入映射和响应式布局
- 统一状态栏提示文案，并补充输入被拦截原因提示
- 调整 AI 1/2/3/4 档候选宽度和选点稳定性，增强难度分层体感

### `09cf844` `feat: add configurable first player in pve`

- 为人机模式增加“玩家先手 / AI 先手”配置
- 同步调整 AI 身份、轮次判定、悔棋恢复与 ELO 结算逻辑

### `c7311de` `fix: improve responsive board input and layout`

- 修复棋盘缩放后的点击映射偏差
- 增强窄屏与移动端布局适配
- 切换为更稳的指针输入处理

### `ecc408e` `docs: bump project version to v1.0.1`

- 统一 README、CHANGELOG、VERSIONING 的版本基线到 `v1.0.1`

### `4b1679e` `fix: restore board input and stabilize ai turns`

- 修复棋盘点击区域判断过严，恢复正常落子输入
- 修复 AI 在部分场景下不出手的问题，并增加保底落子兜底
- 补强对局状态流转，包括 AI 思考状态、平局处理与结束态更新
- 优化悬停预览、动画调度和悔棋后的状态重建

### `e59fad8` `docs: add versioning workflow`

- 新增 [`VERSIONING.md`](VERSIONING.md)
- 规范提交、标签、回滚和上传流程
- 在 README 中加入版本管理入口

### `e69158a` `fix: complete init flow and align board coordinates`

- 补全初始化流程
- 修正棋盘绘制与胜利线使用的坐标对齐问题

### `9d82165` `docs: 增加精美的 README.md 文档`

- 补充项目展示型 README
- 作为当前稳定回滚标签 `v1.0.0-stable-20260417` 的对应提交

## 早期版本

### `55e4e4a` `Initial commit: 五子棋卓越版 - 功能完整修复与动画升级`

- 初始可运行版本
- 包含基础棋盘、AI、动画和界面资源
