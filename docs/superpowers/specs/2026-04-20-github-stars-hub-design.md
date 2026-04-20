# GitHub Stars 分类导航页设计

## 1. 背景与目标

用户希望把自己的 GitHub Stars 汇总到一个页面中，便于统一查看、筛选和查找。

这个页面需要满足以下目标：

- 自动同步 GitHub Stars
- 对仓库进行自动初步分类
- 支持后续手动微调分类和展示效果
- 在 GitHub 上可直接展示
- README 提供入口
- GitHub Pages 提供完整浏览体验
- 每天自动更新
- 支持手动触发更新

本项目第一版聚焦于“稳定可用的个人 Star 导航页”，不引入后端服务和数据库。

## 2. 方案选择

### 2.1 候选方案

#### 方案 A：纯前端 + Actions 生成静态数据
- GitHub Actions 拉取 Stars 并生成 JSON
- GitHub Pages 读取 JSON 渲染页面
- 实现简单，适合快速上线
- 但对手动微调支持较弱，需要后续补配置层

#### 方案 B：构建时生成完整静态站点
- 使用静态站点方案生成完整页面
- 页面质量高、扩展性强
- 但工程复杂度更高

#### 方案 C：静态站点 + 自动分类 + 手动覆盖配置（推荐）
- GitHub Actions 拉取 Stars
- 自动完成初步分类
- 通过 `overrides.json` 修正分类、备注、置顶、隐藏等
- 构建完整 GitHub Pages 页面
- README 只放入口与摘要

### 2.2 选型结论

采用 **方案 C**。

原因：

- 最符合“自动初分 + 手动微调”的核心需求
- 适合 GitHub Pages，无需独立后端
- 自动化与可控性平衡最好
- 后续易扩展为更完整的个人资源导航站

## 3. 产品范围

### 3.1 第一版包含

- GitHub Stars 自动拉取
- 基于规则的自动分类
- 覆盖配置文件手动修正
- GitHub Pages 完整展示页
- README 入口链接与摘要信息
- 每日自动更新
- 手动触发更新

### 3.2 第一版不包含

- 多用户支持
- 登录态
- 后端服务
- 数据库存储
- 复杂推荐算法
- 图表分析面板
- AI 自动总结收藏原因

## 4. 信息架构

### 4.1 README 的定位

README 不承担完整展示，而是承担入口功能：

- 简要说明项目用途
- 提供 GitHub Pages 链接
- 展示关键摘要信息：总 Star 数、分类数、最近更新时间

这样 README 保持简洁，不会堆积大量仓库卡片。

### 4.2 GitHub Pages 的定位

GitHub Pages 承担完整浏览体验：

- 浏览全部 Stars
- 按分类查看
- 搜索与筛选
- 查看仓库摘要信息
- 跳转到原始 GitHub 仓库

## 5. 页面结构设计

### 5.1 顶部区域

页面顶部展示：

- 页面标题
- 一句简介
- 最后更新时间
- GitHub 个人主页或当前仓库链接
- 总仓库数量
- 分类总数

### 5.2 搜索与筛选区域

支持以下交互：

- 关键词搜索
- 按分类筛选
- 按语言筛选
- 排序切换

排序项建议包括：

- 最近 Star
- 仓库 star 数
- 最近更新时间
- 名称排序

### 5.3 分类展示区域

页面主体按分类输出 section。

推荐默认分类：

- AI / LLM
- Frontend
- Backend
- Fullstack
- DevTools
- CLI
- Data / Database
- Automation
- Infra / Ops
- Learning / Docs
- Design
- Misc

### 5.4 仓库卡片字段

每张卡片至少显示：

- 仓库名
- 描述
- owner
- language
- star 数
- topics
- 仓库链接

可选增强字段：

- 备注
- 置顶标记
- 最近更新时间

## 6. 数据架构

### 6.1 原始数据

通过 GitHub API 拉取用户 starred repositories，保留原始响应中的核心字段，并输出为 `stars.raw.json`。

建议保留字段：

- `full_name`
- `name`
- `owner.login`
- `html_url`
- `description`
- `homepage`
- `language`
- `stargazers_count`
- `topics`
- `updated_at`
- `created_at`
- `starred_at`（如果接口可得）

### 6.2 最终展示数据

对原始数据做分类与覆盖处理后，生成 `stars.json` 供页面使用。

最终数据应包含：

- 原始核心字段
- 自动分类结果
- 覆盖后的最终分类
- 是否隐藏
- 是否置顶
- 备注
- 排序权重

## 7. 自动分类设计

### 7.1 分类信号优先级

自动分类使用多信号规则，优先级如下：

1. `topics`
2. 仓库名关键词
3. 描述关键词
4. 主语言

语言仅作为辅助信号，避免单靠语言导致误分。

### 7.2 规则思路

示例：

- 命中 `llm`、`ai`、`agent`、`anthropic`、`openai` 等，优先进入 `AI / LLM`
- 命中 `nextjs`、`react`、`vite`、`ui`、`component` 等，优先进入 `Frontend`
- 命中 `playwright`、`automation`、`workflow`、`crawler` 等，优先进入 `Automation`
- 命中 `cli`、`terminal`、`shell` 等，优先进入 `CLI`

若多个分类同时命中，按预设优先级选出一个主分类。

若无法明确判断，归入 `Misc`。

## 8. 手动覆盖设计

### 8.1 配置文件

使用 `data/overrides.json` 作为手动覆盖配置。

### 8.2 覆盖能力

每个仓库允许覆盖以下字段：

- `category`
- `hidden`
- `pinned`
- `note`
- `weight`

示例用途：

- 把自动分错的仓库重新归类
- 隐藏不想展示的 Star
- 置顶高价值仓库
- 补充“为什么收藏”的备注
- 调整排序优先级

### 8.3 合并策略

最终数据流：

1. 拉取原始 Stars 数据
2. 自动分类
3. 读取 `overrides.json`
4. 用覆盖配置修正分类和展示属性
5. 输出 `stars.json`

## 9. 仓库结构建议

```text
.github/workflows/
  update-stars.yml

data/
  overrides.json
  stars.raw.json
  stars.json

scripts/
  fetch-stars.(js|ts)
  classify-stars.(js|ts)
  merge-overrides.(js|ts)

site/ 或 src/
  页面源码
```

说明：

- `data/` 放数据与人工配置
- `scripts/` 放数据处理脚本
- `site/` 或 `src/` 放前端页面源码
- `.github/workflows/` 放自动更新和部署流程

## 10. 自动更新与部署

### 10.1 更新触发

工作流支持两种主要触发方式：

- `schedule`：每天自动执行一次
- `workflow_dispatch`：手动触发

可选增加：当 `overrides.json` 被修改时自动重建。

### 10.2 工作流职责

`update-stars.yml` 负责：

1. 拉取 GitHub Stars
2. 生成原始数据文件
3. 自动分类
4. 合并覆盖配置
5. 构建静态站点
6. 部署到 GitHub Pages

### 10.3 GitHub API 认证

建议优先支持两种 Token：

- `GH_PAT`：优先使用，能力更完整
- `GITHUB_TOKEN`：作为回退方案

这样既兼顾灵活性，也方便快速部署。

### 10.4 Pages 部署方式

优先使用 GitHub 官方推荐的 Pages Actions 流程，而不是依赖老式 `gh-pages` 分支推送。

## 11. 稳定性与失败策略

需要明确以下策略：

- GitHub API 拉取失败时，不覆盖上次成功的数据
- 构建失败时，不部署新页面，保留线上版本
- 仓库字段缺失时，页面降级显示而不是报错
- 日志输出清楚标明失败阶段：抓取、分类、合并、构建、部署

## 12. 技术原则

第一版坚持以下原则：

- 静态优先
- 无后端依赖
- 数据流清晰可追踪
- 自动化优先，但允许人工纠偏
- README 简洁，完整体验交给 Pages

## 13. 后续可扩展方向

如果第一版跑通，后续可考虑：

- 收藏原因的可视化展示
- 每个分类的置顶推荐区
- 标签云或统计视图
- 支持按 topic 聚合
- 支持多语言 README 入口文案
- 增加“最近新增收藏”专区

## 14. 实施结论

本设计定义了一个基于 GitHub Actions + GitHub Pages 的个人 GitHub Stars 导航页方案。

该方案兼顾：

- 自动同步
- 自动分类
- 手动微调
- GitHub 内展示
- 低维护成本

第一阶段应按本设计进入实现规划，先完成核心闭环：抓取、分类、覆盖、展示、自动部署。
