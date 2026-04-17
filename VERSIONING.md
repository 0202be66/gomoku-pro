# Git 版本管理规范

本项目目前采用 `main` 作为主分支，配合阶段性提交与可回滚标签管理版本。

## 当前基线

- 当前发布标签: `v1.0.2`
- 当前开发基线: `afd9785` `feat: expand replay controls and playback`
- 当前稳定回滚标签: `v1.0.0-stable-20260417`

## 提交规范

建议每次只提交一个明确目的的改动，提交信息使用以下前缀:

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 重构，不改行为
- `docs:` 文档更新
- `style:` 样式或界面调整
- `perf:` 性能优化
- `chore:` 杂项维护

示例:

```bash
git commit -m "feat: add move preview highlight"
git commit -m "fix: correct renju forbidden move detection"
git commit -m "perf: reduce AI candidate search range"
```

## 何时打标签

以下情况建议创建标签:

- 一个稳定版本已经验证可玩，准备作为回滚点
- 一个阶段性功能完成，后续可能继续做较大修改
- 一次重要重构完成，想保留清晰断点

推荐标签格式:

```text
v主版本.次版本.修订号-说明
v主版本.次版本.修订号-stable-YYYYMMDD
```

示例:

```bash
git tag -a v1.0.1-ai-search -m "Improve AI candidate ordering and pruning"
git tag -a v1.0.2-stable-20260418 -m "Stable rollback checkpoint after renju fixes"
```

## 推荐工作流

每次做完一个功能点，按下面节奏处理:

1. 查看变更
   ```bash
   git status
   git diff
   ```
2. 暂存相关文件
   ```bash
   git add game.js ai.js style.css
   ```
3. 创建清晰提交
   ```bash
   git commit -m "feat: add win line animation polish"
   ```
4. 如需保留回滚点，创建标签
   ```bash
   git tag -a v1.0.3-animation-pass -m "Checkpoint after animation polish"
   ```
5. 上传提交
   ```bash
   git push origin main
   ```
6. 如创建了标签，再上传标签
   ```bash
   git push origin v1.0.3-animation-pass
   ```

## 回滚方式

不要直接覆盖当前开发状态，优先新建回滚分支查看旧版本:

```bash
git switch -c rollback/v1.0.0-stable v1.0.0-stable-20260417
```

如果只是临时查看某个标签:

```bash
git switch --detach v1.0.0-stable-20260417
```

## 适合本项目的版本节奏

结合这个五子棋项目当前体量，建议使用下面的节奏:

- 小改动: 直接提交并推送，不必打标签
- 一个完整功能: 提交后打一个功能标签
- 明显稳定版本: 打 `stable` 标签并推送

推荐按功能分批:

- AI 改进单独一批
- 禁手规则修复单独一批
- 动画和音效单独一批
- UI 与交互单独一批

这样后面出了问题，能快速定位是哪个阶段引入的。
