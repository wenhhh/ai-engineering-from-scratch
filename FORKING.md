# 派生仓库指南（Forking Guide）

本课程采用 MIT 许可证（MIT License）。你可以创建派生仓库（Fork），并按自身需求调整。以下介绍几种使用方式。

## 团队培训（For Teams）

打算将课程用于内部培训？创建派生仓库后，可以这样定制：

1. 创建派生仓库
2. 删除团队不需要的阶段
3. 加入公司业务相关的示例和数据
4. 在课程交付物中集成内部工具
5. 保留来源署名，帮助社区发展

## 学校与高校（For Schools & Universities）

打算将课程用作教材？

1. 创建派生仓库
2. 将课程阶段对应到学期教学安排
3. 为练习补充评分量规（Rubric）
4. 加入自己的作业与考试
5. 考虑将改进贡献回上游

## 训练营（For Bootcamps）

打算开设收费训练营？MIT 许可证允许这种用途。

1. 创建派生仓库，并按照学员批次的时间安排组织内容
2. 加入视频、直播课与导师辅导
3. 在现有代码和文档的基础上继续开发
4. 考虑赞助项目或向上游贡献改进

## 其他编程语言（For Other Languages）

打算用另一种编程语言教授本课程？

1. 创建派生仓库
2. 用选定的语言重新实现代码示例
3. 保留课程结构和文档
4. 提交拉取请求（Pull Request，PR），申请在主仓库 README 中添加你的派生仓库链接

## 同步上游更新（Keeping Your Fork Updated）

```bash
git remote add upstream https://github.com/rohitg00/ai-engineering-from-scratch.git

git fetch upstream
git merge upstream/main
```

## 来源署名（Attribution）

MIT 不要求采用下面这种额外的署名展示形式，但我们欢迎你这样标注：

```text
基于《从零开始的 AI 工程（AI Engineering from Scratch）》
https://github.com/rohitg00/ai-engineering-from-scratch
```
