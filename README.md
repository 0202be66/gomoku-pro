# ⚪⚫ Gomoku Pro - 卓越五子棋博弈系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![Platform: Web](https://img.shields.io/badge/Platform-Web-brightgreen.svg)]()

**五子棋卓越版** 是一款基于 Canvas 开发的专业级五子棋博弈系统。它不仅拥有精致的视觉效果和拟真的交互动画，更内置了强大的 AI 引擎与专业的连珠（Renju）禁手规则。

---

## ✨ 核心特性

- **🧠 强力 AI 引擎**：基于 Minimax 算法与 Alpha-Beta 剪枝优化，支持多级难度预测，提供专家级的博弈体验。
- **📜 专业连珠禁手**：支持可选的专业禁手规则（长连禁手、三三禁手、四四禁手），让对局更公平、更具深度。
- **🎨 沉浸式交互**：
  - **落子动画**：模拟真实的物理下落过程，具备缩放与动态阴影反馈。
  - **获胜特效**：炫酷的粒子喷泉庆祝效果。
  - **拟真棋盘**：顶级榧木纹理与专业星位标注。
- **🎵 多维度反馈**：内置极简物理撞击音效与实时状态栏提示。
- **🏆 棋力评估系统**：内置 ELO 积分系统与段位晋升机制（从“棋坛新手”到“求败天师”）。
- **⏮️ 智能操作**：支持无限次悔棋、重开新局及对战模式切换。

---

## 🚀 快速开始

该项目无需安装复杂的依赖，只需通过浏览器即可启动：

1. 克隆本仓库：
   ```bash
   git clone https://github.com/0202be66/gomoku-pro.git
   ```
2. 在浏览器中打开 `index.html`。
3. 立即开始您的卓越对局！

---

## 🛠️ 技术栈

- **前端核心**：Vanilla JavaScript (ES6+)
- **图形渲染**：HTML5 Canvas API
- **视觉设计**：CSS3 (Flexbox, CSS Variables, Animations)
- **AI 算法**：Minimax Strategy + Alpha-Beta Pruning + Pattern Evaluation System

---

## 🧾 版本管理

项目已补充 Git 版本管理说明，便于后续阶段性提交、打标签和回滚：

- 查看文档：[VERSIONING.md](VERSIONING.md)
- 当前稳定回滚标签：`v1.0.0-stable-20260417`

---

## 🗺️ 未来规划 (Roadmap)

- [ ] **3D 视角升级**：引入 Three.js 实现真正的 2.5D/3D 沉浸式棋盘。
- [ ] **AI 复盘导师**：赛后自动标记胜负手，并演示 AI 推荐的最佳走法。
- [ ] **在线联机**：通过 WebSocket 实现跨设备的真人实时对战。
- [ ] **皮肤市场**：支持“云子”、“玉石”、“水墨”等多种棋具皮肤切换。

---

## 🤝 参与贡献

欢迎通过 Issue 提交 Bug，或直接发起 Pull Request 参与功能优化！

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。

---
*Created with ❤️ by Gemini CLI Assistant*
