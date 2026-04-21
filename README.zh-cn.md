# GitHub Stars Hub

把 GitHub Stars 整理成一个可搜索、可分类、可部署到 GitHub Pages 的静态导航站。

- 在线浏览：<https://lzaske.github.io/Github_Start/>
- 英文入口：[`README.md`](README.md)
- Full Guide（英文详细说明）：[`docs/readme-variants/full.md`](docs/readme-variants/full.md)
- Quick Start Guide（英文快速说明）：[`docs/readme-variants/portal.md`](docs/readme-variants/portal.md)

## 这个项目能做什么

- 同步 GitHub Stars
- 按规则进行初步分类
- 支持手动微调结果
- 可选将仓库描述翻译为简体中文
- 通过 GitHub Actions / GitHub Pages 发布静态站点

## 从这里进入

| 你想做什么 | 去哪里 |
| --- | --- |
| 直接看成品 | <https://lzaske.github.io/Github_Start/> |
| 看完整说明、配置、部署、实现细节（英文） | [`docs/readme-variants/full.md`](docs/readme-variants/full.md) |
| 看更短的快速上手说明（英文） | [`docs/readme-variants/portal.md`](docs/readme-variants/portal.md) |
| 看英文入口 | [`README.md`](README.md) |

## 关键入口

- 拉取 Stars：[`scripts/fetch-stars.mjs`](scripts/fetch-stars.mjs)
- 构建数据：[`scripts/build-stars-data.mjs`](scripts/build-stars-data.mjs)
- 分类逻辑：[`scripts/classify-stars.mjs`](scripts/classify-stars.mjs)
- 翻译脚本：[`scripts/translate-descriptions.mjs`](scripts/translate-descriptions.mjs)
- 手动覆盖：[`data/overrides.json`](data/overrides.json)
- 自动发布：[`.github/workflows/update-stars.yml`](.github/workflows/update-stars.yml)
- 前端页面：[`src/`](src)

## 快速开始

如果你想：

- **快速了解项目**：先看在线站点或英文版 [`docs/readme-variants/portal.md`](docs/readme-variants/portal.md)
- **自己部署 / 配置 / 本地运行**：直接看英文版 [`docs/readme-variants/full.md`](docs/readme-variants/full.md)

这份中文 README 只作为总入口，不展开配置、覆盖示例和实现细节。

目前两份更详细的文档（Full Guide / Quick Start Guide）均以英文编写，适合继续查看配置、部署和实现说明。
