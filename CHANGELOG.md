# 更新记录

本项目当前采用手动维护的变更记录，按时间倒序整理关键版本节点。

## 2026-04-17

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
