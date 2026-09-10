# 综合实践 04：多模态文档问答（Multimodal Document QA，TypeScript）

查看器骨架返回文档页面图像的 URL，以及被引用边界框（Bounding Box）的 JSON 列表。
HTML 响应内嵌一段简短的画布叠加（Canvas Overlay）脚本，
按页面坐标绘制引用区域。当前代码未加载页面底图，也未调用 `../main.py` 中的
Python 流水线；两者是分别演示检索算法和查看界面的独立示例。

## 目录结构（Layout）

```text
ts/
  package.json
  tsconfig.json
  src/
    index.ts        # 入口，演示 + HTTP 服务器
    server.ts       # hono 应用，/health、/、/document/:id
    fixtures.ts     # 10-K 表格 + Nature 图形测试夹具（Fixture）
    render.ts       # HTML 索引页 + 逐文档叠加层渲染器（Overlay Renderer）
    types.ts        # DocumentFixture, EvidenceRegion, BoundingBox
  tests/
    fixtures.test.ts
    render.test.ts
    server.test.ts
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start          # 执行一轮自检，以状态码 0 退出
npm run serve      # 在 127.0.0.1:<port> 上运行交互式 HTTP 服务器
```

未设置 `PORT` 时，交互式服务器会选择空闲端口，并将
所选 URL 打印到标准输出（Standard Output）。访问 `/` 查看索引页，访问 `/document/10k-acme-2025` 查看
演示叠加层，或设置 `accept: application/json` 获取结构化响应。

## 测试（Tests）

通过 tsx 使用 `node --test` 测试运行器。测试覆盖测试夹具查找（正例与反例）、
五种危险字符的 HTML 转义（Escaping）、文档 HTML 载荷（Payload）结构，
以及 hono 路由（200、404、内容协商（Content Negotiation））。


## 演示数据与验证边界

两份文档均为固定夹具，标题、财务数字、论文名、4.1 倍等表述不是经过核验的真实资料。
问题和回答已提供中文，引用摘录保留英文原文，便于与边界框和表格内容对应。
`pageImageUrl` 只是占位路径，服务没有对应的静态图片路由；画布只显示预设引用框。

界面转义测试覆盖标题和问题中的固定样本，不等于完整防注入验证。引用数据被直接
序列化到内联脚本中，因此不要直接将任意不可信文档内容当作安全载荷接入。
`npm start` 的演示入口只打印符合预期的状态码数量；计数不足时没有主动非零退出，
不能只凭退出码认定探测全部通过。
