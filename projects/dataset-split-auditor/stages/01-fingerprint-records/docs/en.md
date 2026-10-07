# 为规范化记录生成指纹（Fingerprint normalized records）

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

随机划分可能将同一个样例以不同 id 同时放入训练集和测试集。对内容计算哈希之前，先规范化 Unicode、空白和大小写。将 id 与内容指纹分开，使重命名的记录仍能被识别为重复。

规范化采用明确的策略。它检测规范化后完全一致的重复项，不识别改写、图像或语义等价的代码。输入空间可被猜测时，哈希也不能让内容匿名。

## 推演一个具体案例（Work through one concrete case）

字符串 "Ｒetry  NOW" 与 "retry now" 经过 NFKC 规范化、大小写折叠和空白合并后得到相同文本。记录 id 可以不同，但内容指纹必须一致。

```figure
pj-dataset-split-auditor-1
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

按照所述契约实现 `fingerprint`。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

在 UTF-8 编码和哈希之前执行规范化。不要对字典的字符串表示计算哈希，因为其顺序和附带元数据可能独立于内容变化。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 1 --path learning-artifacts/dataset-split-auditor --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 检查失败边界（Investigate the failure boundary）

尝试 "retry now!"。标点仍有意义，因此本契约不应声称它与 "retry now" 匹配。




## 参考资料（References）

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
